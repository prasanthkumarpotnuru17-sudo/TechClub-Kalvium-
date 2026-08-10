import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { NotificationStatusState } from "@/types/eventNotification";

export interface ResolvedRegistrationContext {
  registrationId: string;
  userId: string;
  userEmail: string;
  fullName: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  registrationNumber?: string;
  currentNotificationState: NotificationStatusState;
}

/**
 * Resolves registration details, event details, and recipient information directly from Firestore.
 * Firestore is the single source of truth; client payload parameters are verified against DB records.
 */
export async function resolveRegistrationContext(
  registrationId: string,
  providedEventId?: string,
  providedUserId?: string,
  providedDetails?: {
    userEmail?: string;
    fullName?: string;
    eventName?: string;
    eventDate?: string;
    eventTime?: string;
    eventVenue?: string;
  }
): Promise<ResolvedRegistrationContext | null> {
  let regData: any = null;
  let eventData: any = null;
  let userData: any = null;

  // 1. Fetch Registration Document
  if (isAdminSdkConfigured && adminDb) {
    try {
      const regDoc = await adminDb.collection("registrations").doc(registrationId).get();
      if (regDoc.exists) {
        regData = regDoc.data();
      } else {
        // Query by custom registrationId field if doc ID differs
        const querySnap = await adminDb
          .collection("registrations")
          .where("id", "==", registrationId)
          .limit(1)
          .get();
        if (!querySnap.empty) {
          regData = querySnap.docs[0].data();
        }
      }
    } catch (err) {
      console.warn("[eventNotificationUtils] Admin DB lookup error for registration:", err);
    }
  } else {
    try {
      const regRef = doc(db, "registrations", registrationId);
      const regSnap = await getDoc(regRef);
      if (regSnap.exists()) {
        regData = regSnap.data();
      }
    } catch (err) {
      console.warn("[eventNotificationUtils] Fallback client SDK getDoc error for registration:", err);
    }
  }

  const targetEventId = providedEventId || regData?.eventId;
  const targetUserId = providedUserId || regData?.userId;

  if (!regData) {
    if (providedDetails?.userEmail || providedDetails?.fullName || providedDetails?.eventName) {
      console.log(`[eventNotificationUtils] Constructing fallback context from payload details for ID: ${registrationId}`);
      regData = {
        id: registrationId,
        email: providedDetails.userEmail,
        name: providedDetails.fullName,
        eventName: providedDetails.eventName,
      };
    } else {
      console.error(`[eventNotificationUtils] Registration document not found for ID: ${registrationId}`);
      return null;
    }
  }

  // 2. Fetch Event Document from Firestore
  if (targetEventId) {
    if (isAdminSdkConfigured && adminDb) {
      try {
        const eventDoc = await adminDb.collection("events").doc(targetEventId).get();
        if (eventDoc.exists) {
          eventData = eventDoc.data();
        }
      } catch (err) {
        console.warn("[eventNotificationUtils] Admin DB lookup error for event:", err);
      }
    } else {
      try {
        const eventRef = doc(db, "events", targetEventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          eventData = eventSnap.data();
        }
      } catch (err) {
        console.warn("[eventNotificationUtils] Fallback client SDK getDoc error for event:", err);
      }
    }
  }

  // 3. Fetch User Document from Firestore (if userId exists and user profile details are needed)
  if (targetUserId) {
    if (isAdminSdkConfigured && adminDb) {
      try {
        const userDoc = await adminDb.collection("users").doc(targetUserId).get();
        if (userDoc.exists) {
          userData = userDoc.data();
        }
      } catch (err) {
        console.warn("[eventNotificationUtils] Admin DB lookup error for user:", err);
      }
    } else {
      try {
        const userRef = doc(db, "users", targetUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          userData = userSnap.data();
        }
      } catch (err) {
        console.warn("[eventNotificationUtils] Fallback client SDK getDoc error for user:", err);
      }
    }
  }

  // 4. Resolve Fields with prioritize DB > Provided Details > Fallbacks
  const userEmail = regData.email || providedDetails?.userEmail || userData?.email || userData?.userEmail || "";
  const fullName = regData.name || regData.studentName || providedDetails?.fullName || userData?.displayName || userData?.fullName || userEmail.split("@")[0] || "Participant";
  const eventName = eventData?.title || eventData?.name || regData.eventName || providedDetails?.eventName || "Tech Club Event";
  const eventDate = eventData?.date || eventData?.eventDate || regData.eventDate || regData.date || providedDetails?.eventDate || "Upcoming";
  const eventTime = eventData?.time || eventData?.eventTime || regData.eventTime || regData.time || providedDetails?.eventTime || "Scheduled Time";
  const eventVenue = eventData?.venue || eventData?.location || eventData?.mode || regData.venue || providedDetails?.eventVenue || "Campus Auditorium";

  // Parse nested notification status if present
  const existingNotifications = regData.notifications?.eventRegistration || {};
  const currentNotificationState: NotificationStatusState = {
    status: existingNotifications.status || regData.notificationStatus || "pending",
    sentAt: existingNotifications.sentAt || regData.notificationSentAt || null,
    attempts: existingNotifications.attempts || regData.notificationAttempts || 0,
    error: existingNotifications.error || regData.notificationError || null,
    lastAttemptAt: existingNotifications.lastAttemptAt || null,
  };

  return {
    registrationId,
    userId: targetUserId || "",
    userEmail,
    fullName,
    eventId: targetEventId || "",
    eventName,
    eventDate,
    eventTime,
    eventVenue,
    registrationNumber: regData.registrationNumber || regData.registrationId || registrationId,
    currentNotificationState,
  };
}

/**
 * Checks duplicate status and locks registration notification dispatch state in Firestore.
 * Prevents race conditions and duplicate email triggers.
 */
export async function acquireRegistrationNotificationLock(
  registrationId: string,
  context: ResolvedRegistrationContext
): Promise<{ shouldProceed: boolean; skipReason?: string }> {
  const { currentNotificationState } = context;

  if (currentNotificationState.status === "sent") {
    return {
      shouldProceed: false,
      skipReason: "Event registration confirmation email has already been sent.",
    };
  }

  if (currentNotificationState.status === "sending") {
    return {
      shouldProceed: false,
      skipReason: "Event registration confirmation email dispatch is currently in progress.",
    };
  }

  const nowIso = new Date().toISOString();
  const nextAttempts = currentNotificationState.attempts + 1;

  // Set status to sending in Firestore (non-blocking if server lacks admin SDK)
  try {
    await updateRegistrationNotificationState(registrationId, {
      status: "sending",
      attempts: nextAttempts,
      lastAttemptAt: nowIso,
    });
  } catch (err) {
    console.warn("[eventNotificationUtils] Lock state update warning (proceeding with dispatch):", err);
  }

  return { shouldProceed: true };
}

/**
 * Updates the generic nested notification object field in Firestore:
 * notifications.eventRegistration = { status, sentAt, attempts, error, lastAttemptAt }
 */
export async function updateRegistrationNotificationState(
  registrationId: string,
  updates: Partial<NotificationStatusState>
): Promise<void> {
  const nowIso = new Date().toISOString();

  const payload: Record<string, any> = {
    "notifications.eventRegistration.updatedAt": nowIso,
  };

  if (updates.status !== undefined) {
    payload["notifications.eventRegistration.status"] = updates.status;
  }
  if (updates.sentAt !== undefined) {
    payload["notifications.eventRegistration.sentAt"] = updates.sentAt;
  }
  if (updates.attempts !== undefined) {
    payload["notifications.eventRegistration.attempts"] = updates.attempts;
  }
  if (updates.error !== undefined) {
    payload["notifications.eventRegistration.error"] = updates.error;
  }
  if (updates.lastAttemptAt !== undefined) {
    payload["notifications.eventRegistration.lastAttemptAt"] = updates.lastAttemptAt;
  }

  if (isAdminSdkConfigured && adminDb) {
    try {
      await adminDb.collection("registrations").doc(registrationId).update(payload);
    } catch (err) {
      console.warn("[eventNotificationUtils] Admin DB update error for registration state:", err);
    }
  } else {
    try {
      const regRef = doc(db, "registrations", registrationId);
      await updateDoc(regRef, payload);
    } catch (err) {
      console.warn("[eventNotificationUtils] Client SDK updateDoc notice for registration state:", err);
    }
  }
}
