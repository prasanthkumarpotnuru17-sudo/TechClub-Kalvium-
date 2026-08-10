import { 
  collection, doc, getDocs, onSnapshot, query, setDoc, updateDoc, deleteDoc, where, serverTimestamp, runTransaction 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CertificateTemplate, CanvasSettings, CanvasElement, certificateTemplateService } from "./certificateTemplateService";
import { certificatePDFService } from "./certificatePDFService";
import { certificateStorageService } from "./certificateStorageService";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";

const CERTIFICATES_COLLECTION = "certificates";
const COUNTERS_COLLECTION = "counters";

export const ENABLE_STORAGE_UPLOAD = true;

export interface TemplateSnapshot {
  name: string;
  version: number;
  canvas: CanvasSettings;
  elements: CanvasElement[];
  assets: {
    backgroundUrl?: string;
    logoUrl?: string;
    signatureUrl?: string;
    sealUrl?: string;
  };
}

export interface IssuedCertificateDoc {
  id: string;
  certificateId: string;
  certificateNumber: string; // e.g. "TC-2026-000001"
  userId: string; // Recipient user/student ID
  studentId: string;
  studentName: string;
  email: string;
  department?: string;
  year?: string;

  eventId: string;
  eventName: string;
  eventDate?: string;

  templateId: string;
  templateVersion: number;
  templateSnapshot: TemplateSnapshot;

  issuedAt: string;
  issuedDate: string;
  issuedBy: {
    uid: string;
    name: string;
  };

  status: "Issued";
  pdfStatus: "Pending" | "Generated" | "Failed";
  certificateUrl?: string | null;
  storagePath?: string;
  verificationToken?: string;
  generatedLocally?: boolean;
  pdfError?: string;
  verificationCode: string;
  isDeleted?: boolean;

  createdAt: any;
  updatedAt: any;
}

function cleanFirestoreData<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  const cleaned: any = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined) continue;
    if (val !== null && typeof val === "object" && !(val instanceof Date) && key !== "createdAt" && key !== "updatedAt") {
      if (Array.isArray(val)) {
        cleaned[key] = val.map((item) => (item !== null && typeof item === "object" ? cleanFirestoreData(item) : item));
      } else {
        cleaned[key] = cleanFirestoreData(val);
      }
    } else {
      cleaned[key] = val;
    }
  }
  return cleaned as T;
}

export const certificateIssueService = {
  /**
   * Real-time listener for issued certificates
   */
  subscribeCertificates(
    callback: (certificates: IssuedCertificateDoc[]) => void, 
    onError?: (error: any) => void
  ): () => void {
    console.log("[certificateIssueService] Subscribing to certificates collection...");
    const q = query(collection(db, CERTIFICATES_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        const certs: IssuedCertificateDoc[] = [];
        snapshot.forEach((docSnap) => {
          certs.push({ id: docSnap.id, ...docSnap.data() } as IssuedCertificateDoc);
        });
        callback(certs);
      },
      (error) => {
        console.error("[certificateIssueService] Error subscribing to certificates:", error);
        if (onError) onError(error);
        else callback([]);
      }
    );
  },

  /**
   * Generate next sequential certificate number (e.g. TC-2026-000001)
   */
  async generateNextCertificateNumber(year: string = new Date().getFullYear().toString()): Promise<string> {
    try {
      const counterRef = doc(db, COUNTERS_COLLECTION, `certificates_${year}`);
      let nextNum = 1;

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1, year });
          nextNum = 1;
        } else {
          nextNum = (counterDoc.data().count || 0) + 1;
          transaction.update(counterRef, { count: nextNum });
        }
      });

      const padded = String(nextNum).padStart(6, "0");
      return `TC-${year}-${padded}`;
    } catch (err) {
      console.warn("[certificateIssueService] Counter transaction fallback to timestamp.");
      return `TC-${year}-${Date.now().toString().slice(-6)}`;
    }
  },

  /**
   * Check if a certificate already exists for (email/studentId + eventId)
   */
  async checkAlreadyIssued(email: string, eventId: string): Promise<boolean> {
    const q = query(
      collection(db, CERTIFICATES_COLLECTION),
      where("eventId", "==", eventId),
      where("email", "==", email.toLowerCase().trim())
    );
    const snap = await getDocs(q);
    let exists = false;
    snap.forEach((d) => {
      const data = d.data();
      if (!data.isDeleted) exists = true;
    });
    return exists;
  },

  /**
   * Atomic Single Certificate Issuance Method
   */
  async issueCertificate(
    student: { studentId: string; studentName: string; email: string; department?: string; year?: string },
    event: { id: string; title: string; date?: string },
    template: CertificateTemplate,
    issuer: { uid: string; name: string },
    renderContainer?: HTMLElement | null
  ): Promise<{ doc: IssuedCertificateDoc; isSkipped?: boolean; emailDeliverySuccess?: boolean; message?: string }> {
    // 1. Check duplicate
    const alreadyIssued = await this.checkAlreadyIssued(student.email, event.id);
    if (alreadyIssued) {
      return { doc: null as any, isSkipped: true };
    }

    // 2. Generate certificate number & verification code
    const certNumber = await this.generateNextCertificateNumber();
    const certId = `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const verificationCode = `VERIFIED-${certNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const issuedDateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

    // 3. Build TemplateSnapshot
    const snapshot: TemplateSnapshot = {
      name: template.name || "Certificate Template",
      version: template.version || 1,
      canvas: template.canvas || {
        paperSize: "A4",
        orientation: "landscape",
        backgroundColor: "#FFFFFF",
        backgroundImageUrl: template.assets?.background?.downloadUrl || "",
        backgroundOpacity: 1,
        showSafeArea: true,
        showGrid: false,
        snapToGrid: true,
      },
      elements: template.elements || [],
      assets: {
        backgroundUrl: template.canvas?.backgroundImageUrl || template.assets?.background?.downloadUrl || "",
        logoUrl: template.assets?.logo?.downloadUrl || "",
        signatureUrl: template.assets?.signature?.downloadUrl || "",
        sealUrl: template.assets?.seal?.downloadUrl || "",
      },
    };

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

    let finalPdfStatus: "Generated" | "Failed" | "Pending" = "Pending";
    let finalCertificateUrl: string | null = null;
    let finalStoragePath: string = "";
    let finalPdfError = "";
    let isGeneratedLocally = false;
    let emailDeliverySuccess = false;

    // 4. Render PDF & handle Local Download / Storage Upload / n8n Webhook
    if (renderContainer) {
      try {
        const pdfBlob = await certificatePDFService.generatePDFBlob(renderContainer, snapshot.canvas);
        const fileName = `${certNumber}_${event.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

        // PDF rendered in memory as Blob for direct upload to Supabase Storage (no local browser download)

        // Convert PDF Blob to Base64 & dispatch via Centralized sendNotification
        try {
          const pdfBase64 = await blobToBase64(pdfBlob);
          const dispatchRes = await sendNotification(NotificationType.CERTIFICATE, {
            email: student.email,
            userEmail: student.email,
            name: student.studentName,
            fullName: student.studentName,
            certificate: {
              eventName: event.title,
              issueDate: issuedDateStr,
              certificateNumber: certNumber,
              verificationCode,
              pdfBase64,
              fileName,
            },
            button: {
              text: "Download Certificate",
              url: `https://tech-club-platform.firebaseapp.com/profile`
            }
          });

          emailDeliverySuccess = dispatchRes.success;
          if (emailDeliverySuccess) {
            console.log(`[n8n Webhook] Certificate emailed successfully for ${student.email}`);
          } else {
            console.warn(`[n8n Webhook] Certificate webhook failed for ${student.email}:`, dispatchRes.error);
          }
        } catch (webhookErr) {
          console.warn("[certificateIssueService] n8n Webhook dispatch error (local PDF download preserved):", webhookErr);
          emailDeliverySuccess = false;
        }

        const sizeKB = (pdfBlob.size / 1024).toFixed(2);
        const sizeMB = (pdfBlob.size / (1024 * 1024)).toFixed(2);
        console.log(`[Step 1/4] PDF generated: ${pdfBlob.size} bytes (${sizeKB} KB / ${sizeMB} MB) for student: ${student.email}`);
        console.log(`[Step 2/4] Uploading PDF (${sizeMB} MB) to Supabase Storage bucket 'certificates'...`);

        try {
          const uploadRes = await certificateStorageService.uploadCertificatePDF(
            pdfBlob,
            event.id || "event",
            student.studentId || student.email || "user",
            certId
          );
          finalStoragePath = uploadRes.storagePath;
          console.log(`[Step 3/4] Upload completed successfully! Storage path: '${finalStoragePath}'`);
        } catch (storageErr: any) {
          const errMsg = storageErr?.message || String(storageErr);
          console.error(`[Supabase Upload Failure] Exact error for ${student.email}:`, errMsg);
          throw new Error(`Supabase Storage PDF upload failed: ${errMsg}`);
        }

        finalPdfStatus = "Generated";
      } catch (pdfErr: any) {
        console.error(`[certificateIssueService] PDF Pipeline Error for ${student.email}:`, pdfErr);
        finalPdfStatus = "Failed";
        finalPdfError = pdfErr?.message || String(pdfErr);
      }
    }

    // 5. Create Firestore record (marked as Generated after PDF generation)
    const rawDoc = {
      id: certId,
      certificateId: certId,
      certificateNumber: certNumber,
      userId: student.studentId || student.email || "",
      studentId: student.studentId || student.email || "",
      studentName: student.studentName || "Student",
      email: student.email ? student.email.toLowerCase().trim() : "",
      department: student.department || "General",
      year: student.year || "2026",
      eventId: event.id || "",
      eventName: event.title || "Event",
      eventDate: event.date || issuedDateStr,
      templateId: template.id || "template",
      templateVersion: template.version || 1,
      templateSnapshot: snapshot,
      issuedAt: issuedDateStr,
      issuedDate: issuedDateStr,
      issuedBy: {
        uid: issuer.uid || "admin",
        name: issuer.name || "Admin Coordinator",
      },
      status: "Issued",
      pdfStatus: finalPdfStatus,
      certificateUrl: finalCertificateUrl,
      storagePath: finalStoragePath,
      verificationToken: verificationCode,
      generatedLocally: isGeneratedLocally,
      pdfError: finalPdfError || "",
      verificationCode,
      isDeleted: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const newDoc = cleanFirestoreData(rawDoc) as IssuedCertificateDoc;

    await setDoc(doc(db, CERTIFICATES_COLLECTION, certId), newDoc);
    console.log(`[Step 4/4] Firestore updated successfully - Cert ID: ${certId}, storagePath: '${finalStoragePath}'`);

    // Increment template usage counter
    if (template.id) {
      certificateTemplateService.incrementTemplateUsage(template.id);
    }

    return {
      doc: newDoc,
      isSkipped: false,
      emailDeliverySuccess,
      message: emailDeliverySuccess
        ? "Certificate issued and emailed successfully."
        : "Certificate downloaded successfully, but email delivery failed."
    };
  },

  /**
   * Batch Issue Certificates Loop with Controlled Concurrency (Limit = 5)
   */
  async batchIssueCertificates(
    students: Array<{ studentId: string; studentName: string; email: string; department?: string; year?: string }>,
    event: { id: string; title: string; date?: string },
    template: CertificateTemplate,
    issuer: { uid: string; name: string },
    renderContainer?: HTMLElement | null,
    onProgress?: (current: number, total: number, studentName: string) => void
  ): Promise<{ generated: number; skipped: number; failed: number }> {
    let generated = 0;
    let skipped = 0;
    let failed = 0;
    let completedCount = 0;

    const concurrencyLimit = 5;
    let index = 0;

    const worker = async () => {
      while (index < students.length) {
        const currentIndex = index++;
        const student = students[currentIndex];

        try {
          const res = await this.issueCertificate(student, event, template, issuer, renderContainer);
          completedCount++;
          if (onProgress) onProgress(completedCount, students.length, student.studentName);

          if (res.isSkipped) {
            skipped++;
          } else if (res.doc.pdfStatus === "Failed") {
            failed++;
          } else {
            generated++;
          }
        } catch (err) {
          console.error(`[certificateIssueService] Error issuing for ${student.email}:`, err);
          completedCount++;
          if (onProgress) onProgress(completedCount, students.length, student.studentName);
          failed++;
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrencyLimit, students.length) }, () => worker());
    await Promise.all(workers);

    return { generated, skipped, failed };
  },

  /**
   * Regenerate PDF from stored templateSnapshot and update Supabase Storage
   */
  async regenerateCertificatePDF(
    certDoc: IssuedCertificateDoc,
    renderContainer: HTMLElement
  ): Promise<string> {
    try {
      const pdfBlob = await certificatePDFService.generatePDFBlob(
        renderContainer,
        certDoc.templateSnapshot?.canvas
      );

      const uploadRes = await certificateStorageService.uploadCertificatePDF(
        pdfBlob,
        certDoc.eventId || "event",
        certDoc.userId || certDoc.studentId || certDoc.email || "user",
        certDoc.certificateId || certDoc.id,
        { upsert: true }
      );

      await updateDoc(doc(db, CERTIFICATES_COLLECTION, certDoc.id), {
        storagePath: uploadRes.storagePath,
        pdfStatus: "Generated",
        updatedAt: serverTimestamp(),
      });

      return uploadRes.storagePath;
    } catch (err: any) {
      await updateDoc(doc(db, CERTIFICATES_COLLECTION, certDoc.id), {
        pdfStatus: "Failed",
        updatedAt: serverTimestamp(),
      });
      throw err;
    }
  },

  /**
   * Soft Delete (Archive) Certificate Record
   */
  async softDeleteCertificate(id: string): Promise<void> {
    await updateDoc(doc(db, CERTIFICATES_COLLECTION, id), {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    });
  },

  /**
   * Hard Delete Certificate Record from Firestore and Supabase Storage
   */
  async deleteCertificate(id: string, storagePathOrUrl?: string): Promise<void> {
    if (storagePathOrUrl) {
      await certificateStorageService.deleteCertificatePDF(storagePathOrUrl);
    }
    await deleteDoc(doc(db, CERTIFICATES_COLLECTION, id));
  }
};
