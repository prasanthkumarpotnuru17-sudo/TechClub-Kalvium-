export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { getDocs, collection, doc, setDoc } from "firebase/firestore";
import { ApiResponse } from "@/types/apiResponse";
import { notificationService } from "@/services/notificationService";

const localDevRegistrationsMap = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, userId, name, email, department, year, overrideCapacity, eventName: bodyEventName } = body;

    const recipientEmail = (email || body.userEmail || "").toLowerCase().trim();
    const recipientName = name || body.fullName || (recipientEmail ? recipientEmail.split("@")[0] : "Participant");

    console.log("[Registration Request] POST request received with payload:", JSON.stringify({ eventId, userId, recipientName, recipientEmail }));

    const reqSource = body.source || "website";

    // 1. Upfront Request Validation
    if (!eventId || !recipientEmail) {
      console.warn("[Registration Request] Bad request: missing eventId or email.");
      return NextResponse.json<ApiResponse>({
        success: false,
        message: "Missing required fields: eventId and email are required.",
        data: null,
        error: "MISSING_REQUIRED_FIELDS"
      }, { status: 400 });
    }

    // Deterministic Document ID for race condition & duplicate prevention
    const userIdentifier = (userId && String(userId).trim() !== "")
      ? userId
      : recipientEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
    const regDocId = `${eventId}_${userIdentifier}`;

    console.log(`[Duplicate Check] Checking active registrations for eventId: ${eventId}, userIdentifier: ${userIdentifier}`);

    let newRegData: any = null;
    let isAlreadyRegistered = false;
    let existingRegId = "";
    let existingRegData: any = null;
    let adminErrorDetails = "";

    // 2. Attempt Admin SDK transaction if configured
    if (isAdminSdkConfigured && adminDb) {
      const db = adminDb;
      try {
        console.log(`[Pipeline Audit] STEP 7: Firestore transaction started | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${userId || userIdentifier}"`);
        newRegData = await db.runTransaction(async (transaction) => {
          const eventRef = db.collection("events").doc(eventId);
          const eventDoc = await transaction.get(eventRef);

          let resolvedEventTitle = bodyEventName || body.eventName || "Tech Club Event";
          let resolvedEventDate = body.eventDate || "TBD";
          let resolvedEventTime = body.eventTime || "Scheduled Time";
          let resolvedEventVenue = body.venue || "Tech Club Main Auditorium";
          let registeredCount = 0;
          let capacity = 0;

          if (eventDoc.exists) {
            const eventData = eventDoc.data()!;
            resolvedEventTitle = eventData.title || resolvedEventTitle;
            resolvedEventDate = eventData.date || resolvedEventDate;
            resolvedEventTime = eventData.time || resolvedEventTime;
            resolvedEventVenue = eventData.venue || resolvedEventVenue;
            capacity = eventData.capacity || 0;
            registeredCount = eventData.registeredCount || 0;

            if (eventData.status === "Closed" || eventData.status === "Cancelled" || eventData.status === "Draft" || eventData.status === "Archived" || eventData.status === "Completed") {
              throw new Error(`Registrations are currently closed for this event (Event Status: ${eventData.status}).`);
            }
            if (eventData.registrationOpenDate) {
              const openTs = Date.parse(eventData.registrationOpenDate);
              if (!isNaN(openTs) && Date.now() < openTs) {
                throw new Error(`Registration for this event opens on ${eventData.registrationOpenDate}.`);
              }
            }
            if (eventData.registrationCloseDate) {
              const closeTs = Date.parse(eventData.registrationCloseDate);
              if (!isNaN(closeTs) && Date.now() > closeTs) {
                throw new Error("Registration period for this event has closed.");
              }
            }
          }

          console.log(`[Pipeline Audit] STEP 5: Duplicate check query | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${userId || userIdentifier}"`);

          // Check direct deterministic document reference first
          const deterministicRegRef = db.collection("registrations").doc(regDocId);
          const deterministicDoc = await transaction.get(deterministicRegRef);

          if (deterministicDoc.exists && !deterministicDoc.data()?.isDeleted && !deterministicDoc.data()?.deleted && deterministicDoc.data()?.status !== "Cancelled") {
            const activeReg = { id: deterministicDoc.id, ...deterministicDoc.data() };
            console.log(`[Pipeline Audit] STEP 6: Duplicate check result count: 1 (EXISTS) | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${userId || userIdentifier}"`);
            const dupErr: any = new Error("You have already registered for this event.");
            dupErr.alreadyRegistered = true;
            dupErr.registrationId = activeReg.id;
            dupErr.registrationData = activeReg;
            throw dupErr;
          }

          // Secondary query check across registrations for eventId to catch alternate user IDs / email matches
          const regsSnap = await db.collection("registrations")
            .where("eventId", "==", eventId)
            .get();

          let activeRegDoc: any = null;
          regsSnap.forEach((d) => {
            const data = d.data();
            if (data.status !== "Cancelled" && !data.isDeleted && !data.deleted) {
              const matchesUid = userId && data.userId === userId;
              const matchesEmail = recipientEmail && data.email?.toLowerCase() === recipientEmail;
              if (matchesUid || matchesEmail) {
                activeRegDoc = { id: d.id, ...data };
              }
            }
          });

          if (activeRegDoc) {
            console.log(`[Pipeline Audit] STEP 6: Duplicate check result count: 1 (MATCH) | registrationId: "${activeRegDoc.id}" | eventId: "${eventId}" | userId: "${userId || userIdentifier}"`);
            const dupErr: any = new Error("You have already registered for this event.");
            dupErr.alreadyRegistered = true;
            dupErr.registrationId = activeRegDoc.id;
            dupErr.registrationData = activeRegDoc;
            throw dupErr;
          }

          console.log(`[Pipeline Audit] STEP 6: Duplicate check result count: 0 (CLEAR) | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${userId || userIdentifier}"`);

          const isFull = capacity > 0 && registeredCount >= capacity;
          if (isFull && !overrideCapacity) {
            throw new Error("Event is fully booked. Waitlist or override capacity required.");
          }

          const yearStr = new Date().getFullYear().toString();
          const countRef = db.collection("system").doc("registrationCounter");
          const countDoc = await transaction.get(countRef);
          let nextNum = 1;
          if (countDoc.exists) {
            nextNum = (countDoc.data()?.current || 0) + 1;
            transaction.update(countRef, { current: nextNum });
          } else {
            transaction.set(countRef, { current: nextNum });
          }
          const regNumber = `TCM-${yearStr}-${String(nextNum).padStart(4, "0")}`;
          const verificationCode = `VERIFIED-${regNumber}-${Date.now().toString().slice(-6)}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationCode)}`;

          const nowIso = new Date().toISOString();
          const regDocData = {
            id: regDocId,
            registrationId: regDocId,
            registrationNumber: regNumber,
            eventId,
            eventName: resolvedEventTitle,
            eventSnapshot: {
              title: resolvedEventTitle,
              date: resolvedEventDate,
              time: resolvedEventTime,
              venue: resolvedEventVenue
            },
            userId: userId || userIdentifier,
            studentName: recipientName,
            name: recipientName,
            email: recipientEmail,
            department: department || "General",
            year: year || "1st Year",
            registrationType: "online",
            status: isFull && !overrideCapacity ? "Waitlist" : "Confirmed",
            overrideCapacity: !!overrideCapacity,
            attendance: "Pending",
            eventDate: resolvedEventDate,
            eventTime: resolvedEventTime,
            venue: resolvedEventVenue,
            verificationCode,
            qrCodeUrl,
            source: reqSource,
            registeredAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
            deleted: false,
            isDeleted: false
          };

          console.log(`[Pipeline Audit] STEP 8: Registration document before write | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${regDocData.userId}"`, regDocData);
          transaction.set(deterministicRegRef, regDocData);

          if (eventDoc.exists) {
            const updatedSeatsLeft = Math.max(0, capacity - (registeredCount + 1));
            transaction.update(eventRef, {
              registeredCount: (registeredCount || 0) + 1,
              seatsLeft: updatedSeatsLeft,
              updatedAt: nowIso,
            });
          }

          return regDocData;
        });

        console.log(`[Pipeline Audit] STEP 9: Registration document written successfully | registrationId: "${regDocId}" | eventId: "${eventId}" | userId: "${newRegData?.userId}"`);

      } catch (adminErr: any) {
        if (adminErr?.alreadyRegistered) {
          isAlreadyRegistered = true;
          existingRegId = adminErr.registrationId;
          existingRegData = adminErr.registrationData;
        } else {
          adminErrorDetails = adminErr?.message || String(adminErr);
          console.warn("[Registration Request] Admin SDK transaction notice:", adminErrorDetails);
        }
      }
    }

    if (isAlreadyRegistered) {
      console.log(`[Duplicate Check] Returning HTTP 409 Conflict for eventId: ${eventId}, regId: ${existingRegId}`);
      return NextResponse.json({
        success: false,
        code: "ALREADY_REGISTERED",
        message: "You have already registered for this event.",
        data: existingRegData,
        registrationId: existingRegId
      }, { status: 409 });
    }

    if (!newRegData && clientDb) {
      try {
        console.log("[Registration Request] Admin SDK not active. Executing fallback server write via Client SDK...");
        const regRef = doc(clientDb, "registrations", regDocId);
        
        const yearStr = new Date().getFullYear().toString();
        const regNumber = `TCM-${yearStr}-${Date.now().toString().slice(-4)}`;
        const verificationCode = `VERIFIED-${regNumber}-${Date.now().toString().slice(-6)}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationCode)}`;
        const nowIso = new Date().toISOString();

        const resolvedEventTitle = bodyEventName || body.eventName || "Tech Club Event";
        const resolvedEventDate = body.eventDate || "TBD";
        const resolvedEventTime = body.eventTime || "Scheduled Time";
        const resolvedEventVenue = body.venue || "Tech Club Main Auditorium";

        newRegData = {
          id: regDocId,
          registrationId: regDocId,
          registrationNumber: regNumber,
          eventId,
          eventName: resolvedEventTitle,
          eventSnapshot: {
            title: resolvedEventTitle,
            date: resolvedEventDate,
            time: resolvedEventTime,
            venue: resolvedEventVenue
          },
          userId: userId || userIdentifier,
          studentName: recipientName,
          name: recipientName,
          email: recipientEmail,
          department: department || "General",
          year: year || "1st Year",
          registrationType: "online",
          status: "Confirmed",
          overrideCapacity: !!overrideCapacity,
          attendance: "Pending",
          eventDate: resolvedEventDate,
          eventTime: resolvedEventTime,
          venue: resolvedEventVenue,
          verificationCode,
          qrCodeUrl,
          source: reqSource,
          registeredAt: nowIso,
          createdAt: nowIso,
          updatedAt: nowIso,
          deleted: false,
          isDeleted: false
        };

        await setDoc(regRef, newRegData, { merge: true });
        console.log("[Registration Request] Fallback server write successful!");
      } catch (fallbackErr: any) {
        console.warn("[Registration Request] Server fallback write warning:", fallbackErr);
        newRegData = null;
        adminErrorDetails = fallbackErr?.message || String(fallbackErr);
      }
    }

    if (!newRegData) {
      console.warn(
        "[Registration Request] Admin SDK not configured. " +
        "Returning 503 ADMIN_SDK_UNAVAILABLE. Detail: " + (adminErrorDetails || "No details")
      );
      return NextResponse.json(
        {
          success: false,
          code: "ADMIN_SDK_UNAVAILABLE",
          message: adminErrorDetails
            ? `Server-side Admin SDK error: ${adminErrorDetails}`
            : "Server-side Admin SDK is not configured. Please ensure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are set in .env.local and restart Next.js server.",
          data: null,
        },
        { status: 503 }
      );
    }

    // 4. Trigger Phase 2 Event Registration Email asynchronously
    if (newRegData && newRegData.id) {
      console.log(`[Registration Request] Triggering sendEventRegistrationEmail for ID: ${newRegData.id}`);
      notificationService.sendEventRegistrationEmail(
        newRegData.id,
        newRegData.eventId,
        newRegData.userId || undefined,
        {
          userEmail: newRegData.email,
          fullName: newRegData.name,
          eventName: newRegData.eventName
        }
      ).catch((err) => {
        console.warn("[Registration Request] Notification dispatch warning:", err);
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Registration created successfully",
      data: newRegData,
      error: null
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Registration Request] Unexpected exception in route handler:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: error.message || "Failed to create registration",
      data: null,
      error: error.message || "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const itemsMap = new Map<string, any>();

    // 1. Fetch using Admin SDK
    if (isAdminSdkConfigured && adminDb) {
      try {
        const snap = await adminDb.collection("registrations").get();
        snap.forEach((d: any) => {
          itemsMap.set(d.id, { id: d.id, ...d.data() });
        });
      } catch (adminErr: any) {
        console.warn("[API /api/admin/registrations] Admin SDK GET notice:", adminErr?.message || adminErr);
      }
    }

    // 2. Fetch using Client SDK if empty
    if (itemsMap.size === 0) {
      try {
        const snap = await getDocs(collection(clientDb, "registrations"));
        snap.forEach((d: any) => {
          itemsMap.set(d.id, { id: d.id, ...d.data() });
        });
      } catch (clientErr: any) {
        console.warn("[API /api/admin/registrations] Client SDK GET notice:", clientErr?.message || clientErr);
      }
    }

    const regsList = Array.from(itemsMap.values());
    return NextResponse.json({
      success: true,
      data: regsList,
    });
  } catch (err: any) {
    console.error("[API /api/admin/registrations] GET Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch registrations", data: [] },
      { status: 500 }
    );
  }
}
