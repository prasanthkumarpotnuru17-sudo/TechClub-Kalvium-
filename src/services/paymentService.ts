import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  runTransaction,
  increment
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { safeSetDoc, safeUpdateDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { PaymentRecord, PaymentStatus, NotificationStatus } from "@/types/paymentTypes";

const COLLECTION_NAME = "payments";

export interface CreatePaymentInput {
  registrationId: string;
  eventId: string;
  eventTitle?: string;
  userId?: string | null;
  studentName: string;
  studentEmail: string;
  amount: number;
  transactionId: string;
  paymentMethod?: string;
  paymentScreenshotUrl: string;
}

export const paymentService = {
  /**
   * Validates and uploads payment proof screenshot to Firebase Storage.
   * Restricts to PNG, JPG, JPEG and max 5 MB size.
   */
  async uploadPaymentScreenshot(file: File, registrationId: string): Promise<string> {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new Error("Invalid image format. Only PNG, JPG, and JPEG files are allowed.");
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSizeInBytes) {
      throw new Error("File size exceeds 5 MB limit. Please upload a smaller image.");
    }

    // Convert file directly to Data URL to avoid browser CORS / Firebase Storage bucket restrictions
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result as string);
        } else {
          reject(new Error("Failed to process image file."));
        }
      };
      reader.onerror = (err) => reject(new Error("Failed to read payment proof screenshot."));
      reader.readAsDataURL(file);
    });
  },

  /**
   * Creates a payment record in `payments` collection and links it to `registrations`.
   */
  async createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
    const now = new Date();
    const nowIso = now.toISOString();

    // Calculate 24-hour expiration timestamp
    const expiresAtDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const expiresAtIso = expiresAtDate.toISOString();

    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedPaymentId = `PAY-${now.getFullYear()}-${randomSuffix}`;
    const docId = `pay_${Date.now()}_${randomSuffix}`;

    const rawPayment: PaymentRecord = {
      id: docId,
      paymentId: generatedPaymentId,
      registrationId: input.registrationId,
      eventId: input.eventId,
      eventTitle: input.eventTitle || "Tech Club Event",
      userId: input.userId || null,
      studentName: input.studentName.trim(),
      studentEmail: input.studentEmail.trim().toLowerCase(),
      amount: Number(input.amount) || 0,
      transactionId: input.transactionId.trim(),
      paymentMethod: input.paymentMethod || "UPI",
      paymentScreenshotUrl: input.paymentScreenshotUrl,
      status: "Pending",
      notificationStatus: NotificationStatus.PENDING,
      history: [{ action: "Submitted", timestamp: nowIso }],
      submittedAt: nowIso,
      expiresAt: expiresAtIso,
      verifiedAt: null,
      verifiedBy: null,
      verifiedByRole: null,
      remarks: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cleanPayment = removeUndefinedFields(rawPayment);

    // 1. Write to payments collection
    try {
      await safeSetDoc(doc(db, COLLECTION_NAME, docId), cleanPayment);
      console.log("[Payment Pipeline] Firestore payment created");
    } catch (clientErr: any) {
      console.error("[Payment Pipeline] Payment creation failed", clientErr);
    }

    // 2. Immediate readback verification
    try {
      const paymentRef = doc(db, COLLECTION_NAME, docId);
      const snap = await getDoc(paymentRef);
      console.log("[Payment Pipeline] Payment exists:\n" + snap.exists());
      if (!snap.exists()) {
        console.error("[Payment Pipeline] Document readback returned false! Document was not persisted to Firestore.");
      }
    } catch (readErr) {
      console.warn("[Payment Pipeline] Readback notice:", readErr);
    }

    // 3. Also POST to API endpoint /api/admin/payments to ensure server cache & Admin SDK receives it
    try {
      await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayment),
      });
    } catch (apiErr) {
      console.warn("[paymentService] API POST error:", apiErr);
    }

    // 4. Update registration document with payment reference
    try {
      const regRef = doc(db, "registrations", input.registrationId);
      await safeUpdateDoc(regRef, {
        paymentRequired: true,
        paymentId: docId,
        paymentStatus: "Pending",
        status: "Payment Pending",
        updatedAt: nowIso,
      });
      console.log(`[Payment Pipeline] Registration created\npaymentId:\n${docId}\nregistrationId:\n${input.registrationId}`);
    } catch (regErr) {
      console.warn("[paymentService] Registration update notice:", regErr);
    }

    // 4. Trigger non-blocking Payment Submitted Notification
    try {
      const { notificationService } = await import("@/services/notificationService");
      notificationService.sendPaymentSubmittedNotification(rawPayment).catch((err) => {
        console.warn("[paymentService] Non-blocking notification notice:", err);
      });
    } catch (err) {
      console.warn("[paymentService] Could not trigger notification service:", err);
    }

    return rawPayment;
  },

  /**
   * Subscribes to payments with real-time snapshot and API polling fallback.
   */
  subscribePayments(
    callback: (payments: PaymentRecord[]) => void,
    onError?: (error: any) => void
  ): () => void {
    let currentMap = new Map<string, PaymentRecord>();

    const notifyCombined = (items: PaymentRecord[]) => {
      items.forEach((item) => currentMap.set(item.id, item));
      const sorted = Array.from(currentMap.values()).sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      callback(sorted);
    };

    // Initial API fetch
    this.getPayments()
      .then((apiItems) => {
        notifyCombined(apiItems);
      })
      .catch(() => {
        notifyCombined([]);
      });

    // Snapshot listener
    let unsubSnapshot: (() => void) | null = null;
    try {
      const q = query(collection(db, COLLECTION_NAME));
      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const snapshotItems: PaymentRecord[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              paymentId: data.paymentId || docSnap.id,
              registrationId: data.registrationId || "",
              eventId: data.eventId || "",
              eventTitle: data.eventTitle || "",
              userId: data.userId || null,
              studentName: data.studentName || "",
              studentEmail: data.studentEmail || "",
              amount: data.amount || 0,
              transactionId: data.transactionId || "",
              paymentMethod: data.paymentMethod || "UPI",
              paymentScreenshotUrl: data.paymentScreenshotUrl || "",
              status: (data.status as any) || "Pending",
              notificationStatus: data.notificationStatus || NotificationStatus.PENDING,
              history: Array.isArray(data.history) ? data.history : [],
              submittedAt: data.submittedAt || data.createdAt || new Date().toISOString(),
              expiresAt: data.expiresAt || new Date().toISOString(),
              verifiedAt: data.verifiedAt || null,
              verifiedBy: data.verifiedBy || null,
              verifiedByRole: data.verifiedByRole || null,
              remarks: data.remarks || null,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          });
          notifyCombined(snapshotItems);
        },
        (error) => {
          console.warn("[paymentService] Snapshot notice (using API fallback):", error?.message || error);
          notifyCombined([]);
        }
      );
    } catch (err: any) {
      console.warn("[paymentService] Snapshot exception:", err?.message || err);
      notifyCombined([]);
    }

    // 4s API Polling fallback
    const pollInterval = setInterval(async () => {
      const freshApiItems = await this.getPayments();
      notifyCombined(freshApiItems);
    }, 4000);

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      clearInterval(pollInterval);
    };
  },

  /**
   * Fetches payments list once from API route or client SDK.
   */
  async getPayments(): Promise<PaymentRecord[]> {
    try {
      const res = await fetch("/api/admin/payments", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as PaymentRecord[];
        }
      }
    } catch (err) {
      console.warn("[paymentService] API GET error:", err);
    }

    try {
      const q = query(collection(db, COLLECTION_NAME));
      const snap = await getDocs(q);
      if (snap.docs.length > 0) {
        return snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            paymentId: data.paymentId || docSnap.id,
            registrationId: data.registrationId || "",
            eventId: data.eventId || "",
            eventTitle: data.eventTitle || "",
            userId: data.userId || null,
            studentName: data.studentName || "",
            studentEmail: data.studentEmail || "",
            amount: data.amount || 0,
            transactionId: data.transactionId || "",
            paymentMethod: data.paymentMethod || "UPI",
            paymentScreenshotUrl: data.paymentScreenshotUrl || "",
            status: (data.status as any) || "Pending",
            notificationStatus: data.notificationStatus || NotificationStatus.PENDING,
            history: Array.isArray(data.history) ? data.history : [],
            submittedAt: data.submittedAt || data.createdAt || new Date().toISOString(),
            expiresAt: data.expiresAt || new Date().toISOString(),
            verifiedAt: data.verifiedAt || null,
            verifiedBy: data.verifiedBy || null,
            verifiedByRole: data.verifiedByRole || null,
            remarks: data.remarks || null,
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
          };
        });
      }
    } catch (clientErr) {
      console.warn("[paymentService] Client SDK getDocs error:", clientErr);
    }

    return [];
  },

  /**
   * Atomic Verification of Payment (Approve, Reject, or Request Re-upload).
   * Executes Firestore Transaction & capacity check, then dispatches notification.
   */
  async verifyPayment(
    paymentId: string,
    action: "Approve" | "Reject" | "RequestReupload",
    remarks?: string,
    adminUser?: { id?: string; name?: string; role?: string }
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const adminIdentifier = adminUser?.name || adminUser?.id || "Super Admin";
    const adminRole = adminUser?.role || "super_admin";

    // 1. Call API PUT handler which uses Admin SDK transaction & duplicate UTR checks
    try {
      const apiRes = await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          action,
          remarks: remarks || null,
          verifiedBy: adminIdentifier,
          verifiedByRole: adminRole,
        }),
      });

      const json = await apiRes.json();
      if (!apiRes.ok || !json.success) {
        throw new Error(json.message || "Payment verification failed.");
      }
    } catch (apiErr: any) {
      console.warn("[paymentService] API PUT error (falling back to client transaction):", apiErr?.message || apiErr);

      // Client-side Firestore Transaction Fallback
      await runTransaction(db, async (transaction) => {
        const paymentRef = doc(db, COLLECTION_NAME, paymentId);
        const paymentDoc = await transaction.get(paymentRef);
        if (!paymentDoc.exists()) {
          throw new Error("Payment record not found.");
        }
        const payData = paymentDoc.data() as PaymentRecord;

        const regRef = doc(db, "registrations", payData.registrationId);
        const regDoc = await transaction.get(regRef);

        const eventRef = doc(db, "events", payData.eventId);
        const eventDoc = await transaction.get(eventRef);

        if (action === "Approve") {
          // Check capacity inside transaction
          if (eventDoc.exists()) {
            const evtData = eventDoc.data();
            const capacity = evtData.capacity || 0;
            const currentRegistered = evtData.registeredCount || 0;
            if (capacity > 0 && currentRegistered >= capacity) {
              throw new Error("Event capacity has been reached. Cannot approve payment.");
            }
          }

          // Check duplicate UTR among verified payments
          const q = query(
            collection(db, COLLECTION_NAME),
            where("transactionId", "==", payData.transactionId),
            where("status", "==", "Verified")
          );
          const duplicateSnap = await getDocs(q);
          const hasOtherVerified = duplicateSnap.docs.some((d) => d.id !== paymentId);
          if (hasOtherVerified) {
            throw new Error(`Transaction ID (UTR) ${payData.transactionId} has already been verified for another payment.`);
          }

          console.log(`[Payment Verification]\nUpdating payment:\npaymentId=${paymentId}\nUpdating registration:\nregistrationId=${payData.registrationId}\nNew paymentStatus:\nVerified`);

          // Update Payment Record
          transaction.update(paymentRef, {
            status: "Verified",
            verifiedAt: nowIso,
            verifiedBy: adminIdentifier,
            verifiedByRole: adminRole,
            remarks: remarks || "Payment approved by Admin.",
            updatedAt: nowIso,
          });

          // Update Registration Record
          if (regDoc.exists()) {
            transaction.update(regRef, {
              paymentStatus: "Verified",
              status: "Confirmed",
              updatedAt: nowIso,
            });
          }

          // Increment Event Registered Count
          if (eventDoc.exists()) {
            transaction.update(eventRef, {
              registeredCount: increment(1),
              updatedAt: nowIso,
            });
          }
        } else {
          // Reject, Request Re-upload, or Expire
          let newPaymentStatus = "Rejected";
          let newRegStatus = "Payment Rejected";
          if (action === "RequestReupload") {
            newPaymentStatus = "Rejected";
            newRegStatus = "Payment Re-upload Required";
          }

          const newRemarks = remarks || (action === "RequestReupload" ? "Please re-upload a clear screenshot or valid UTR." : "Payment verification rejected.");

          console.log(`[Payment Verification]\nUpdating payment:\npaymentId=${paymentId}\nUpdating registration:\nregistrationId=${payData.registrationId}\nNew paymentStatus:\n${newPaymentStatus}`);

          transaction.update(paymentRef, {
            status: newPaymentStatus,
            verifiedAt: nowIso,
            verifiedBy: adminIdentifier,
            verifiedByRole: adminRole,
            remarks: newRemarks,
            updatedAt: nowIso,
          });

          if (regDoc.exists()) {
            transaction.update(regRef, {
              paymentStatus: newPaymentStatus,
              status: newRegStatus,
              updatedAt: nowIso,
            });
          }
        }
      });
    }

    // 2. Fetch payment record to trigger post-transaction notification dispatch
    try {
      const payRecord = await this.getPayment(paymentId);
      if (payRecord) {
        const { notificationService } = await import("@/services/notificationService");
        if (action === "Approve") {
          notificationService.sendPaymentApprovedNotification(payRecord).catch((err) => {
            console.warn("[paymentService] Approved notification warning:", err);
          });
        } else {
          notificationService.sendPaymentRejectedNotification(payRecord).catch((err) => {
            console.warn("[paymentService] Rejected notification warning:", err);
          });
        }
      }
    } catch (notifErr) {
      console.warn("[paymentService] Post-transaction notification notice:", notifErr);
    }
  },

  /**
   * Fetch single payment record by ID.
   */
  async getPayment(id: string): Promise<PaymentRecord | null> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as PaymentRecord;
      }
    } catch (err) {
      console.warn("[paymentService] getPayment error:", err);
    }

    const all = await this.getPayments();
    return all.find((p) => p.id === id || p.paymentId === id) || null;
  },

  /**
   * Re-submits payment proof screenshot and UTR for a rejected payment.
   */
  async resubmitPaymentProof(
    paymentId: string,
    newTransactionId: string,
    newScreenshotUrl: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const updates = {
      transactionId: newTransactionId.trim(),
      paymentScreenshotUrl: newScreenshotUrl,
      status: "Pending",
      submittedAt: nowIso,
      updatedAt: nowIso,
      remarks: "Proof resubmitted by student. Awaiting re-verification.",
    };

    try {
      await fetch("/api/admin/payments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, updates }),
      });
    } catch (err) {
      console.warn("[paymentService] API PUT error during resubmit:", err);
    }

    try {
      await safeUpdateDoc(doc(db, COLLECTION_NAME, paymentId), updates);
    } catch (err) {
      console.warn("[paymentService] Client update notice during resubmit:", err);
    }
  },

  /**
   * Permanently deletes a payment record doc from Firestore and unlinks registration.
   */
  async deletePaymentRecord(paymentId: string): Promise<void> {
    let regId: string | null = null;
    try {
      const paySnap = await getDoc(doc(db, COLLECTION_NAME, paymentId));
      if (paySnap.exists()) {
        regId = paySnap.data()?.registrationId || null;
      }
    } catch (_) {}

    try {
      await fetch("/api/admin/payments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
    } catch (err) {
      console.warn("[paymentService] API DELETE notice:", err);
    }

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, paymentId));
    } catch (err) {
      console.warn("[paymentService] Client deleteDoc notice:", err);
    }

    if (regId) {
      try {
        await safeUpdateDoc(doc(db, "registrations", regId), {
          paymentId: null,
          paymentStatus: "NA",
          paymentRequired: false,
          updatedAt: new Date().toISOString(),
        });
      } catch (regErr) {
        console.warn("[paymentService] Registration unlink notice:", regErr);
      }
    }
  },
};
