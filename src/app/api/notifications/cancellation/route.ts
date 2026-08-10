import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { 
  collection, query, where, getDocs, doc, getDoc, writeBatch, serverTimestamp 
} from "firebase/firestore";
import { NotificationType } from "@/types/notificationTypes";
import { sendNotification, generateCorrelationId } from "@/lib/notificationDispatcher";
import { safeUpdateDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { ApiResponse } from "@/types/apiResponse";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, reason, cancelledBy, force, retryFailedOnly, registrationsOverride } = body;

    if (!eventId) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: "Missing required parameter: eventId is required.",
        data: null,
        error: "MISSING_EVENT_ID"
      }, { status: 400 });
    }

    const cancellationReason = reason || "Event cancelled due to unforeseen schedule changes.";
    const adminName = cancelledBy || "System Admin";
    const nowIso = new Date().toISOString();

    // 1. Fetch Event Details
    let eventTitle = "Tech Club Event";
    let eventDate = "TBA";
    let eventTime = "Scheduled Time";
    let eventVenue = "Tech Club Main Auditorium";
    let cancellationVersion = 1;

    try {
      const eventSnap = await getDoc(doc(db, "events", eventId));
      if (eventSnap.exists()) {
        const ev = eventSnap.data();
        eventTitle = ev.title || eventTitle;
        eventDate = ev.date || eventDate;
        eventTime = ev.time || eventTime;
        eventVenue = ev.venue || eventVenue;
        cancellationVersion = (ev.cancellationVersion || 0) + 1;
      }
    } catch (eventFetchErr) {
      console.warn("[Cancellation API] Error fetching event details:", eventFetchErr);
    }

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
        console.warn("[Cancellation API] Error querying registrations:", regFetchErr);
      }
    }

    // If retrying failed only, filter to participants who haven't received the email
    if (retryFailedOnly) {
      targetRegistrations = targetRegistrations.filter((r) => r.cancellationEmailSent !== true);
      console.log(`[Cancellation API] Retry Failed Mode: ${targetRegistrations.length} participant(s) selected for retry.`);
    }

    const totalTargeted = targetRegistrations.length;
    let skippedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    const successfulRegUpdates: Array<{ id: string; correlationId: string }> = [];

    console.log(`[Cancellation API] Processing cancellation broadcast v${cancellationVersion} for Event ${eventId} (${eventTitle}). Targeted: ${totalTargeted}`);

    // 3. Dispatch Cancellation Emails
    for (const reg of targetRegistrations) {
      const recipientEmail = reg.email || reg.userEmail || reg.studentEmail;
      const recipientName = reg.studentName || reg.name || reg.fullName || (recipientEmail ? recipientEmail.split("@")[0] : "Participant");

      if (!recipientEmail) {
        console.warn(`[Cancellation API] Skipping registration ${reg.id} due to missing email address.`);
        skippedCount++;
        continue;
      }

      // Deduplication check: skip if already sent for this cancellation version unless force is explicitly true
      if (reg.cancellationEmailSent === true && reg.cancellationVersion === cancellationVersion && !force && !retryFailedOnly) {
        console.log(`[Cancellation API] Skipping ${recipientEmail} — cancellation email v${cancellationVersion} already dispatched.`);
        skippedCount++;
        continue;
      }

      const correlationId = generateCorrelationId();
      const payload = {
        correlationId,
        cancellationVersion,
        type: "cancellation",
        notificationType: NotificationType.CANCELLATION,
        eventId,
        eventTitle,
        eventDate,
        eventTime,
        venue: eventVenue,
        studentName: recipientName,
        studentEmail: recipientEmail,
        userId: reg.userId || null,
        registrationId: reg.registrationNumber || reg.id,
        reason: cancellationReason,
        cancelledBy: adminName,
        cancelledAt: nowIso,
        button: {
          text: "View Upcoming Events",
          url: `${process.env.NEXT_PUBLIC_APP_URL || "https://tech-club-platform.firebaseapp.com"}/events`
        }
      };

      try {
        const result = await sendNotification(NotificationType.CANCELLATION, payload);
        if (result.success) {
          successCount++;
          successfulRegUpdates.push({ id: reg.id, correlationId });
        } else {
          failedCount++;
          console.warn(`[Cancellation API] Failed to dispatch cancellation email to ${recipientEmail}:`, result.error);
        }
      } catch (dispatchErr: any) {
        failedCount++;
        console.error(`[Cancellation API] Exception dispatching to ${recipientEmail}:`, dispatchErr.message || dispatchErr);
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
              cancellationEmailSent: true,
              cancellationNotificationId: item.correlationId,
              cancellationVersion: cancellationVersion,
              cancellationEmailSentAt: nowIso,
              updatedAt: nowIso
            });
          }
          await batch.commit();
          console.log(`[Cancellation API] Committed batched updates (v${cancellationVersion}) for ${chunk.length} registration documents.`);
        }
      } catch (batchErr) {
        console.warn("[Cancellation API] Error executing batched registration updates:", batchErr);
      }
    }

    // 5. Determine Notification Status & Update Event Metadata (PRESERVE registeredCount and capacity!)
    let finalNotificationStatus = "Cancellation Sent";
    if (totalTargeted > 0) {
      if (failedCount === 0) {
        finalNotificationStatus = "Cancellation Sent";
      } else if (successCount > 0 && failedCount > 0) {
        finalNotificationStatus = "Partial";
      } else if (successCount === 0) {
        finalNotificationStatus = "Failed";
      }
    }

    try {
      const completedIso = new Date().toISOString();
      await safeUpdateDoc(doc(db, "events", eventId), {
        status: "Cancelled",
        registrationClosed: true,
        cancellationReason,
        cancelledBy: adminName,
        cancelledAt: nowIso,
        cancellationVersion: cancellationVersion,
        notificationStatus: finalNotificationStatus,
        notificationSentAt: nowIso,
        notificationCompletedAt: completedIso,
        cancellationSuccessCount: successCount,
        cancellationFailedCount: failedCount,
        cancellationTotalTargeted: totalTargeted,
        updatedAt: completedIso
      });
      console.log(`[Cancellation API] Event ${eventId} updated to Cancelled v${cancellationVersion} with notificationStatus: ${finalNotificationStatus} at ${completedIso}`);
    } catch (eventUpdateErr) {
      console.warn("[Cancellation API] Error updating event document metadata:", eventUpdateErr);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Cancellation broadcast completed. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}, Total: ${totalTargeted}`,
      data: {
        eventId,
        eventTitle,
        notificationStatus: finalNotificationStatus,
        successCount,
        failedCount,
        skippedCount,
        totalTargeted
      },
      error: null
    }, { status: 200 });

  } catch (error: any) {
    console.error("[Cancellation API] Unexpected error in route handler:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: error.message || "Failed to process event cancellation notification",
      data: null,
      error: error.message || "INTERNAL_SERVER_ERROR"
    }, { status: 500 });
  }
}
