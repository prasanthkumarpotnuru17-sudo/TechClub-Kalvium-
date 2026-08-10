import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";

export async function POST(req: Request) {
  console.log("=================== [Reminder Send API Started] ===================");
  try {
    // 1. Parse & Log Incoming Request Body
    let body: any = {};
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("[Reminder Send API Error] Failed to parse request JSON body:", parseErr);
      return NextResponse.json({
        success: false,
        error: "INVALID_JSON_BODY",
        message: "Failed to parse JSON body from request."
      }, { status: 400 });
    }

    console.log("[Reminder Send API] Incoming Request Body:", JSON.stringify(body, null, 2));

    const { eventId, schedule } = body;

    // 2. Validate eventId
    if (!eventId || typeof eventId !== "string" || !eventId.trim()) {
      console.error("[Reminder Send API Error] Missing or invalid eventId in request body:", body);
      return NextResponse.json({
        success: false,
        error: "MISSING_EVENT_ID",
        message: "eventId is required and must be a non-empty string."
      }, { status: 400 });
    }

    console.log(`[Reminder Send API] Target eventId: "${eventId}"`);

    // 3. Fetch Event Document & Registrations (Admin SDK -> Request Body -> Client SDK)
    let eventData: any = body.event || null;
    let rawRegistrations: any[] = Array.isArray(body.registrations) ? body.registrations : [];

    if (adminDb) {
      console.log("[Reminder Send API] Using Admin SDK for Firestore queries.");
      try {
        const eventDoc = await adminDb.collection("events").doc(eventId).get();
        if (eventDoc.exists) {
          eventData = { id: eventDoc.id, ...eventDoc.data() };
        } else if (!eventData) {
          console.error(`[Reminder Send API Error] Event document not found in 'events' collection for ID: ${eventId}`);
          return NextResponse.json({
            success: false,
            error: "EVENT_NOT_FOUND",
            message: `Event document with ID '${eventId}' was not found in Firestore.`
          }, { status: 404 });
        }

        const regsSnap = await adminDb.collection("registrations")
          .where("eventId", "==", eventId)
          .get();

        const adminRegs: any[] = [];
        regsSnap.forEach((docSnap) => {
          adminRegs.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (adminRegs.length > 0 || rawRegistrations.length === 0) {
          rawRegistrations = adminRegs;
        }
      } catch (evtFetchErr: any) {
        console.warn(`[Reminder Send API Warning] Admin SDK query failed for ID ${eventId}, using payload fallbacks:`, evtFetchErr.message);
      }
    }

    if (!eventData || rawRegistrations.length === 0) {
      console.log("[Reminder Send API] Attempting client SDK fallback query for missing event or registrations.");
      try {
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc, collection, query, where, getDocs } = await import("firebase/firestore");

        if (!eventData) {
          const eventRef = doc(db, "events", eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            eventData = { id: eventSnap.id, ...eventSnap.data() };
          }
        }

        if (rawRegistrations.length === 0) {
          const q = query(collection(db, "registrations"), where("eventId", "==", eventId));
          const regsSnap = await getDocs(q);
          regsSnap.forEach((docSnap) => {
            rawRegistrations.push({ id: docSnap.id, ...docSnap.data() });
          });
        }
      } catch (fallbackErr: any) {
        console.warn("[Reminder Send API Warning] Client SDK Firestore query failed:", fallbackErr.message);
      }
    }

    if (!eventData) {
      console.error(`[Reminder Send API Error] Event document not found for ID: ${eventId}`);
      return NextResponse.json({
        success: false,
        error: "EVENT_NOT_FOUND",
        message: `Event document with ID '${eventId}' was not found in Firestore.`
      }, { status: 404 });
    }

    // 4. Log Event Document & Validate Fields
    console.log("[Reminder Send API] Event Document Data:", JSON.stringify(eventData, null, 2));

    const eventTitle = eventData.title || eventData.name || "Tech Club Event";
    const eventDate = eventData.date || eventData.eventDate || "TBA";
    const eventTime = eventData.time || eventData.eventTime || "TBA";
    const eventVenue = eventData.venue || eventData.mode || "Campus";

    if (!eventData.title) console.warn("[Reminder Send API Warning] 'title' missing on event doc, using fallback:", eventTitle);
    if (!eventData.date) console.warn("[Reminder Send API Warning] 'date' missing on event doc, using fallback:", eventDate);
    if (!eventData.time) console.warn("[Reminder Send API Warning] 'time' missing on event doc, using fallback:", eventTime);
    if (!eventData.venue) console.warn("[Reminder Send API Warning] 'venue' missing on event doc, using fallback:", eventVenue);

    console.log(`[Reminder Send API] Total raw registrations found for event "${eventId}": ${rawRegistrations.length}`);

    // 5. Filter Registrations (status !== "Cancelled") & Check Email / Name
    const activeRegistrations = rawRegistrations.filter((r) => {
      const status = (r.status || "").toString();
      return status.toLowerCase() !== "cancelled";
    });

    console.log(`[Reminder Send API] Active registrations count (excluding Cancelled): ${activeRegistrations.length}`);

    if (activeRegistrations.length === 0) {
      console.log("[Reminder Send API] No active registered participants found. Returning early success.");
      return NextResponse.json({
        success: true,
        eventId,
        eventTitle,
        totalRecipients: 0,
        sent: 0,
        failed: 0,
        message: "No active registered participants found for this event."
      });
    }

    // Determine Base URL for Button Links
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // 6. Iterate Active Registrations & Dispatch Reminders via sendNotification
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const reg of activeRegistrations) {
      const recipientEmail = reg.email || reg.userEmail;
      const recipientName = reg.name || reg.fullName || reg.displayName || "Member";

      if (!recipientEmail) {
        console.warn(`[Reminder Send API Warning] Registration ID ${reg.id} missing email field. Skipping.`, reg);
        failedCount++;
        errors.push(`Registration ID ${reg.id} missing email.`);
        continue;
      }

      const dispatchResult = await sendNotification(NotificationType.REMINDER, {
        email: recipientEmail,
        userEmail: recipientEmail,
        name: recipientName,
        fullName: recipientName,
        eventId: eventData.id,
        registrationId: reg.id || null,
        event: {
          id: eventData.id,
          title: eventTitle,
          date: eventDate,
          time: eventTime,
          venue: eventVenue
        },
        button: {
          text: "View Event",
          url: `${baseUrl}/#events`
        }
      });

      if (dispatchResult.success) {
        sentCount++;
      } else {
        failedCount++;
        errors.push(`Failed for ${recipientEmail}: ${dispatchResult.error}`);
      }
    }

    // Log last manual reminder timestamp on event doc if adminDb is available
    if (adminDb) {
      await adminDb.collection("events").doc(eventId).update({
        "reminders.lastSentAt": new Date().toISOString()
      }).catch(() => {});
    }

    console.log(`=================== [Reminder Send API Completed] Total: ${activeRegistrations.length}, Sent: ${sentCount}, Failed: ${failedCount} ===================`);

    return NextResponse.json({
      success: true,
      eventId: eventData.id,
      eventTitle,
      totalRecipients: activeRegistrations.length,
      sent: sentCount,
      failed: failedCount,
      schedule: schedule || "manual",
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error("=================== [CRITICAL ERROR IN /api/reminders/send] ===================");
    console.error(error);
    console.error("===============================================================================");
    
    return NextResponse.json({
      success: false,
      error: "INTERNAL_REMINDER_SEND_ERROR",
      message: error.message || String(error)
    }, { status: 500 });
  }
}
