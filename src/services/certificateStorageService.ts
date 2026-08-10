import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage as firebaseStorage } from "@/lib/firebase";

export interface StorageAssetResult {
  storagePath: string;
  downloadUrl: string;
}

export interface SupabaseUploadResult {
  storagePath: string;
  certificateUrl?: string;
}

export const certificateStorageService = {
  /**
   * Upload a template asset image (background, logo, signature, seal) to Firebase Storage
   * Path structure: certificate-templates/{templateId}/{assetType}_{filename}
   */
  async uploadTemplateAsset(
    file: File,
    templateId: string = "draft",
    assetType: "background" | "logo" | "signature" | "seal" | string = "asset"
  ): Promise<StorageAssetResult> {
    try {
      const sanitizedName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
      const storagePath = `certificate-templates/${templateId}/${assetType}_${Date.now()}_${sanitizedName}`;
      const storageRef = ref(firebaseStorage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      return { storagePath, downloadUrl };
    } catch (error: any) {
      console.error("[certificateStorageService] Template asset upload failed:", error);
      throw new Error(`Failed to upload ${assetType} image asset to Firebase Storage: ${error?.message || error}`);
    }
  },

  /**
   * Legacy wrapper for backward compatibility
   */
  async uploadAsset(file: File, path: string = "templates"): Promise<string> {
    const res = await this.uploadTemplateAsset(file, "general", path);
    return res.downloadUrl;
  },

  /**
   * Delete an asset file from Storage by path or URL
   */
  async deleteAsset(storagePathOrUrl: string): Promise<void> {
    try {
      const storageRef = ref(firebaseStorage, storagePathOrUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.warn("[certificateStorageService] Could not delete storage object:", error);
    }
  },

  /**
   * Secure Server-Side Certificate Upload Handler
   * Posts PDF Blob to Next.js API Route (/api/certificates/upload)
   * The server uploads to Supabase Storage using the SUPABASE_SERVICE_ROLE_KEY
   * avoiding client-side RLS policy violations.
   */
  async uploadCertificatePDF(
    pdfBlob: Blob,
    eventId: string,
    userId: string,
    certificateId: string,
    options?: { upsert?: boolean; retries?: number }
  ): Promise<SupabaseUploadResult> {
    const sanitizedEventId = (eventId || "general_event").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const sanitizedUserId = (userId || "anonymous_user").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
    const sanitizedCertId = (certificateId || `cert_${Date.now()}`).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");

    const expectedObjectPath = `${sanitizedEventId}/${sanitizedUserId}/${sanitizedCertId}.pdf`;

    console.log(`[Certificate Service] Dispatching PDF (${pdfBlob.size} bytes) to server upload endpoint...`);

    const formData = new FormData();
    formData.append("file", pdfBlob, `${sanitizedCertId}.pdf`);
    formData.append("eventId", sanitizedEventId);
    formData.append("userId", sanitizedUserId);
    formData.append("certificateId", sanitizedCertId);

    const res = await fetch("/api/certificates/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server API upload failed with status ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Server API route returned failure for PDF upload.");
    }

    console.log(`[Certificate Service] Upload completed via server route! StoragePath: '${data.storagePath}'`);
    return {
      storagePath: data.storagePath || expectedObjectPath,
    };
  },

  /**
   * Dynamically generate a fresh signed URL for a certificate PDF via Server API Route
   */
  async getCertificateSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
    if (!storagePath) return "";

    try {
      const res = await fetch("/api/certificates/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath, expiresIn: expiresInSeconds }),
      });

      if (!res.ok) return "";
      const data = await res.json();
      return data.signedUrl || "";
    } catch (err) {
      console.warn("[certificateStorageService] Failed to generate signed URL via server route:", err);
      return "";
    }
  },

  /**
   * Alias for backward compatibility
   */
  async getCertificateDownloadUrl(storagePathOrUrl: string): Promise<string> {
    if (storagePathOrUrl.startsWith("http://") || storagePathOrUrl.startsWith("https://")) {
      return storagePathOrUrl;
    }
    return this.getCertificateSignedUrl(storagePathOrUrl);
  },

  /**
   * Delete a certificate PDF file from Supabase Storage via Server API Route
   */
  async deleteCertificatePDF(storagePath: string): Promise<void> {
    if (!storagePath) return;

    try {
      await fetch("/api/certificates/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
    } catch (err) {
      console.warn("[certificateStorageService] Error deleting PDF via server route:", err);
    }
  },

  /**
   * Check if a certificate PDF file exists in Supabase Storage via signed URL attempt
   */
  async checkFileExists(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;
    const url = await this.getCertificateSignedUrl(storagePath, 60);
    return Boolean(url);
  }
};
