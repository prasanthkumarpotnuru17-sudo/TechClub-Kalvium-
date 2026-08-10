import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { 
  collection, doc, getDoc, getDocs, writeBatch 
} from "firebase/firestore";
import { NotificationType } from "@/types/notificationTypes";
import { sendNotification, generateCorrelationId } from "@/lib/notificationDispatcher";
import { ApiResponse } from "@/types/apiResponse";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      eventId, 
      newDate, 
      newTime, 
      newVenue, 
      reason, 
      rescheduledBy, 
      registrationsOverride 
    } = body;

    if (!eventId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: "Missing required parameter: eventId is required.",
        data: null,
        error: "MISSING_EVENT_ID"
      }, { status: 400 });
    }

    const rescheduleReason = reason || "Event rescheduled due to schedule updates.";
    const adminName = rescheduledBy || "System Admin";
    const nowIso = new Date().toISOString();

    // 1. Fetch Event Details
    let eventTitle = "Tech Club Event";
    let oldDate = "TBA";
    let oldTime = "TBA";
    let currentVenue = "Tech Club Main Auditorium";
    let rescheduleVersion = 1;

    try {
      const { adminDb, isAdminSdkConfigured } = await import("@/lib/firebaseAdmin");
      let evData: any = null;
      if (isAdminSdkConfigured && adminDb) {
        const snap = await adminDb.collection("events").doc(eventId).get();
        if (snap.exists) evData = snap.data();
      }
      if (!evData) {
        const snap = await getDoc(doc(db, "events", eventId));
        if (snap.exists()) evData = snap.data();
      }

      if (evData) {
        eventTitle = evData.title || eventTitle;
        oldDate = evData.oldDate || evData.date || oldDate;
        oldTime = evData.oldTime || evData.time || oldTime;
        currentVenue = newVenue || evData.venue || currentVenue;
        rescheduleVersion = (evData.rescheduleVersion || 0) + 1;
      }
    } catch (eventFetchErr) {
      console.warn("[Reschedule API] Error fetching event details:", eventFetchErr);
    }

    const targetDate = newDate || oldDate;
    const targetTime = newTime || oldTime;

    // 2. Fetch Active Confirmed/Waitlisted Participants
    let targetRegistrations: any[] = [];
    if (Array.isArray(registrationsOverride) && registrationsOverride.length > 0) {
      targetRegistrations = registrationsOverride;
    } else {
      try {
        let allDocs: any[] = [];
        const { adminDb, isAdminSdkConfigured } = await import("@/lib/firebaseAdmin");
        if (isAdminSdkConfigured && adminDb) {
          const snap = await adminDb.collection("registrations").get();
          allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } else {
          const snap = await getDocs(collection(db, "registrations"));
          allDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        targetRegistrations = allDocs.filter((r: any) => {
          if (r.isDeleted || r.userDeleted) return false;
          const matchesEvent =
            r.eventId === eventId ||
            (r.eventName && eventTitle && r.eventName.toLowerCase().trim() === eventTitle.toLowerCase().trim()) ||
            (r.eventTitle && eventTitle && r.eventTitle.toLowerCase().trim() === eventTitle.toLowerCase().trim());
          if (!matchesEvent) return false;
          const st = (r.status || "").toLowerCase();
          const isCancelled = st === "cancelled" || st === "rejected" || st === "payment rejected";
          return !isCancelled;
        });
      } catch (regFetchErr) {
        console.warn("[Reschedule API] Error querying registrations:", regFetchErr);
      }
    }

    const totalTargeted = targetRegistrations.length;
    let skippedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const successfulRegUpdates: Array<{ id: string; correlationId: string }> = [];

    console.log(`[Reschedule API] Processing reschedule broadcast v${rescheduleVersion} for Event ${eventId} (${eventTitle}). Targeted: ${totalTargeted}`);

    // 3. Dispatch Reschedule Notifications
    for (const reg of targetRegistrations) {
      const recipientEmail = reg.email || reg.userEmail || reg.studentEmail;
      const recipientName = reg.studentName || reg.name || reg.fullName || (recipientEmail ? recipientEmail.split("@")[0] : "Participant");

      if (!recipientEmail) {
        skippedCount++;
        continue;
      }

      const correlationId = generateCorrelationId();
      const payload = {
        correlationId,
        rescheduleVersion,
        type: "event_rescheduled",
        notificationType: NotificationType.RESCHEDULED,
        eventId,
        eventTitle,
        oldDate,
        oldTime,
        newDate: targetDate,
        newTime: targetTime,
        eventDate: targetDate,
        eventTime: targetTime,
        venue: currentVenue,
        studentName: recipientName,
        studentEmail: recipientEmail,
        userId: reg.userId || null,
        registrationId: reg.registrationNumber || reg.id,
        reason: rescheduleReason,
        rescheduledBy: adminName,
        rescheduledAt: nowIso,
        button: {
          text: "View Rescheduled Event",
          url: `${process.env.NEXT_PUBLIC_APP_URL || "https://tech-club-platform.firebaseapp.com"}/events`
        }
      };

      try {
        const result = await sendNotification(NotificationType.RESCHEDULED, payload);
        if (result.success) {
          successCount++;
          successfulRegUpdates.push({ id: reg.id, correlationId });
        } else {
          failedCount++;
          console.warn(`[Reschedule API] Failed to dispatch reschedule email to ${recipientEmail}:`, result.error);
        }
      } catch (dispatchErr: any) {
        failedCount++;
        console.error(`[Reschedule API] Exception dispatching to ${recipientEmail}:`, dispatchErr.message || dispatchErr);
      }
    }

    // 4. Batched Updates to Registration Flags
    if (successfulRegUpdates.length > 0) {
      try {
        const chunkSize = 400;
        for (let i = 0; i < successfulRegUpdates.length; i += chunkSize) {
          const chunk = successfulRegUpdates.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const item of chunk) {
            const regRef = doc(db, "registrations", item.id);
            batch.update(regRef, {
              rescheduleEmailSent: true,
              rescheduleNotificationId: item.correlationId,
              rescheduleVersion: rescheduleVersion,
              rescheduleEmailSentAt: nowIso,
              updatedAt: nowIso
            });
          }
          await batch.commit();
        }
      } catch (batchErr) {
        console.warn("[Reschedule API] Error committing registration updates:", batchErr);
      }
    }

    let finalNotificationStatus = "Reschedule Sent";
    if (totalTargeted > 0) {
      if (failedCount === 0) {
        finalNotificationStatus = "Reschedule Sent";
      } else if (successCount > 0 && failedCount > 0) {
        finalNotificationStatus = "Partial";
      } else if (successCount === 0) {
        finalNotificationStatus = "Failed";
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Reschedule broadcast completed for ${eventTitle}. Targeted: ${totalTargeted}, Sent: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`,
      data: {
        totalTargeted,
        successCount,
        failedCount,
        skippedCount,
        notificationStatus: finalNotificationStatus,
        rescheduleVersion
      },
      error: null
    }, { status: 200 });

  } catch (err: any) {
    console.error("[Reschedule API] Error executing reschedule broadcast:", err);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: err.message || "Failed to process reschedule broadcast.",
      data: null,
      error: "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}
