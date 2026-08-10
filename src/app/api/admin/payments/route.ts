import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { doc, getDocs, collection } from "firebase/firestore";
import { safeSetDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { PaymentRecord, PaymentStatus, RegistrationStatus, NotificationStatus, isValidStateTransition } from "@/types/paymentTypes";
import { FieldValue } from "firebase-admin/firestore";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";

/**
 * GET /api/admin/payments
 * 100% Read-Only fetch of payment documents from the "payments" collection.
 * Zero database write side-effects on read.
 */
export async function GET() {
  try {
    const itemsMap = new Map<string, any>();

    // 1. Fetch using Admin SDK
    if (isAdminSdkConfigured && adminDb) {
      try {
        const snap = await adminDb.collection("payments").orderBy("submittedAt", "desc").get();
        snap.forEach((docSnap) => {
          itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (adminErr: any) {
        console.warn("[API /api/admin/payments] Admin SDK GET notice:", adminErr?.message || adminErr);
      }
    }

    // 2. Fetch using Client SDK fallback if empty
    if (itemsMap.size === 0) {
      try {
        const snap = await getDocs(collection(clientDb, "payments"));
        snap.forEach((docSnap) => {
          itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (clientErr: any) {
        console.warn("[API /api/admin/payments] Client SDK GET notice:", clientErr?.message || clientErr);
      }
    }

    const paymentsList = Array.from(itemsMap.values()).sort((a, b) => {
      const timeA = new Date(b.submittedAt || b.createdAt || 0).getTime();
      const timeB = new Date(a.submittedAt || a.createdAt || 0).getTime();
      return timeA - timeB;
    });

    return NextResponse.json({
      success: true,
      data: paymentsList,
    });
  } catch (err: any) {
    console.error("[API /api/admin/payments] GET Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch payments", data: [] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payments
 * Create a new payment record (1:1 with registration)
 */
export async function POST(req: Request) {
  try {
    const body: Partial<PaymentRecord> = await req.json();

    if (!body.id || !body.registrationId || !body.eventId || !body.transactionId) {
      return NextResponse.json(
        { success: false, message: "Missing required payment fields (id, registrationId, eventId, transactionId)." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const paymentId = body.id;

    const initialHistoryEntry = {
      action: "Submitted",
      admin: null,
      remarks: "Payment proof submitted by student.",
      timestamp: nowIso,
    };

    const cleanPayload = removeUndefinedFields({
      ...body,
      id: paymentId,
      paymentId: paymentId,
      registrationId: body.registrationId || paymentId,
      status: body.status || PaymentStatus.PENDING,
      notificationStatus: NotificationStatus.PENDING,
      notificationRetryCount: 0,
      history: body.history && Array.isArray(body.history) && body.history.length > 0 ? body.history : [initialHistoryEntry],
      submittedAt: body.submittedAt || nowIso,
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
    });

    let isSaved = false;
    if (isAdminSdkConfigured && adminDb) {
      try {
        await adminDb.collection("payments").doc(paymentId).set(cleanPayload, { merge: true });
        isSaved = true;
      } catch (adminErr: any) {
        console.warn("[API /api/admin/payments] Admin SDK POST notice:", adminErr?.message || adminErr);
      }
    }

    if (!isSaved) {
      try {
        await safeSetDoc(doc(clientDb, "payments", paymentId), cleanPayload, { merge: true });
        isSaved = true;
      } catch (clientErr: any) {
        console.warn("[API /api/admin/payments] Client SDK POST notice:", clientErr?.message || clientErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment record created successfully.",
      data: cleanPayload,
    });
  } catch (err: any) {
    console.error("[API /api/admin/payments] POST Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/payments
 * Atomic Payment Verification Transaction with State Machine Guards
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { paymentId, action, remarks, verifiedBy, verifiedByRole, updates } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, message: "paymentId parameter is required." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Handle generic update/resubmit
    if (updates) {
      const cleanUpdates = removeUndefinedFields({
        ...updates,
        updatedAt: nowIso,
      });

      if (isAdminSdkConfigured && adminDb) {
        await adminDb.collection("payments").doc(paymentId).set(cleanUpdates, { merge: true });
      } else {
        await safeSetDoc(doc(clientDb, "payments", paymentId), cleanUpdates, { merge: true });
      }
      return NextResponse.json({ success: true, message: "Payment record updated successfully." });
    }

    if (!action) {
      return NextResponse.json(
        { success: false, message: "action parameter is required (Approve | Reject | RequestReupload)." },
        { status: 400 }
      );
    }

    const adminIdentifier = verifiedBy || "Super Admin";
    const adminRoleStr = verifiedByRole || "super_admin";
    const targetStatus = action === "Approve" ? PaymentStatus.APPROVED : PaymentStatus.REJECTED;

    let notificationDetails: { recipientEmail: string; recipientName: string; eventTitle: string } | null = null;

    // Execute Atomic Admin SDK Transaction
    if (isAdminSdkConfigured && adminDb) {
      const firestoreDb = adminDb;
      try {
        await firestoreDb.runTransaction(async (transaction) => {
          const paymentRef = firestoreDb.collection("payments").doc(paymentId);
          const paymentDoc = await transaction.get(paymentRef);

          if (!paymentDoc.exists) {
            throw new Error(`Payment record "${paymentId}" not found in Firestore.`);
          }

          const payData = paymentDoc.data()!;
          const currentStatus = payData.status || PaymentStatus.PENDING;

          // 1. Idempotency Check: If already Approved, return early without error or double seat increment
          if (currentStatus === PaymentStatus.APPROVED && targetStatus === PaymentStatus.APPROVED) {
            console.log(`[Payment Verification] Payment "${paymentId}" is ALREADY Approved. Idempotent success.`);
            return;
          }

          // 2. State Machine Validation
          const transitionCheck = isValidStateTransition(currentStatus, targetStatus);
          if (!transitionCheck.valid) {
            throw new Error(transitionCheck.reason || "Invalid state transition.");
          }

          const regRef = firestoreDb.collection("registrations").doc(payData.registrationId || paymentId);
          const regDoc = await transaction.get(regRef);

          const eventId = payData.eventId || (regDoc.exists ? regDoc.data()?.eventId : null);
          const eventRef = eventId ? firestoreDb.collection("events").doc(eventId) : null;
          const eventDoc = eventRef ? await transaction.get(eventRef) : null;

          // 3. Capacity Recheck Inside Transaction
          if (targetStatus === PaymentStatus.APPROVED && eventDoc && eventDoc.exists) {
            const evtData = eventDoc.data()!;
            const capacity = evtData.capacity || 0;
            const currentRegistered = evtData.registeredCount || 0;
            if (capacity > 0 && currentRegistered >= capacity) {
              throw new Error("Event capacity has been reached. Cannot approve payment.");
            }
          }

          // 4. Build Append-Only Audit Entry
          const auditEntry = {
            action: action === "Approve" ? "Approved" : "Rejected",
            admin: adminIdentifier,
            remarks: remarks || (action === "Approve" ? "Payment approved by Admin." : "Payment verification rejected."),
            timestamp: nowIso,
          };
          const existingHistory = Array.isArray(payData.history) ? payData.history : [];
          const updatedHistory = [...existingHistory, auditEntry];

          // 5. Update Payment Document
          transaction.update(paymentRef, {
            status: targetStatus,
            notificationStatus: NotificationStatus.PENDING,
            history: updatedHistory,
            verifiedAt: nowIso,
            verifiedBy: adminIdentifier,
            verifiedByRole: adminRoleStr,
            remarks: auditEntry.remarks,
            updatedAt: nowIso,
          });

          // 6. Update Registration Document
          if (regDoc.exists) {
            transaction.update(regRef, {
              paymentStatus: targetStatus,
              status: targetStatus === PaymentStatus.APPROVED ? RegistrationStatus.CONFIRMED : RegistrationStatus.REJECTED,
              updatedAt: nowIso,
            });
          }

          // 7. Increment Seat Count ONLY upon transition to Approved
          if (targetStatus === PaymentStatus.APPROVED && eventRef && eventDoc && eventDoc.exists) {
            transaction.update(eventRef, {
              registeredCount: FieldValue.increment(1),
              updatedAt: nowIso,
            });
          }

          notificationDetails = {
            recipientEmail: payData.studentEmail || (regDoc.exists ? regDoc.data()?.email : ""),
            recipientName: payData.studentName || (regDoc.exists ? regDoc.data()?.studentName : "Participant"),
            eventTitle: payData.eventTitle || (eventDoc && eventDoc.exists ? eventDoc.data()?.title : "Tech Club Event"),
          };
        });
      } catch (transErr: any) {
        console.error("[Payment Verification] Transaction failed:", transErr?.message || transErr);
        return NextResponse.json(
          { success: false, message: transErr?.message || "Payment verification transaction failed." },
          { status: 400 }
        );
      }
    } else {
      // Client SDK fallback for dev mode
      const payRef = doc(clientDb, "payments", paymentId);
      const regRef = doc(clientDb, "registrations", paymentId);

      await safeSetDoc(payRef, {
        status: targetStatus,
        verifiedAt: nowIso,
        verifiedBy: adminIdentifier,
        updatedAt: nowIso,
      }, { merge: true });

      await safeSetDoc(regRef, {
        paymentStatus: targetStatus,
        status: targetStatus === PaymentStatus.APPROVED ? RegistrationStatus.CONFIRMED : RegistrationStatus.REJECTED,
        updatedAt: nowIso,
      }, { merge: true });
    }

    // 8. Post-Commit Notification Dispatch (Triggers strictly AFTER transaction succeeds)
    if (notificationDetails && (notificationDetails as any).recipientEmail) {
      try {
        const notifType = targetStatus === PaymentStatus.APPROVED ? NotificationType.EVENT_REGISTRATION : NotificationType.CANCELLATION;
        const notifRes = await sendNotification(notifType, {
          email: (notificationDetails as any).recipientEmail,
          name: (notificationDetails as any).recipientName,
          subject: targetStatus === PaymentStatus.APPROVED ? `Payment Approved - Ticket Confirmed for ${(notificationDetails as any).eventTitle}` : `Payment Update - ${(notificationDetails as any).eventTitle}`,
          eventTitle: (notificationDetails as any).eventTitle,
          registrationId: paymentId,
        });

        // Update notificationStatus metadata on payment doc
        if (isAdminSdkConfigured && adminDb) {
          await adminDb.collection("payments").doc(paymentId).update({
            notificationStatus: notifRes.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
            lastNotificationAttempt: nowIso,
            lastNotificationError: notifRes.error || null,
          });
        }
      } catch (notifErr: any) {
        console.warn("[Payment Verification] Non-blocking post-commit notification error:", notifErr?.message || notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment successfully ${targetStatus === PaymentStatus.APPROVED ? "Approved" : "Rejected"}.`,
    });
  } catch (err: any) {
    console.error("[API /api/admin/payments] PUT Exception:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error during verification." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { paymentId } = await req.json();
    if (!paymentId) {
      return NextResponse.json({ success: false, message: "Missing paymentId parameter" }, { status: 400 });
    }

    if (isAdminSdkConfigured && adminDb) {
      const payRef = adminDb.collection("payments").doc(paymentId);
      const paySnap = await payRef.get();
      const regId = paySnap.exists ? paySnap.data()?.registrationId : null;

      await payRef.delete();

      if (regId) {
        try {
          await adminDb.collection("registrations").doc(regId).update({
            paymentId: FieldValue.delete(),
            paymentStatus: "NA",
            paymentRequired: false,
          });
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, message: "Payment record permanently deleted." });
  } catch (err: any) {
    console.error("[API /api/admin/payments] DELETE Exception:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to delete payment record" }, { status: 500 });
  }
}
