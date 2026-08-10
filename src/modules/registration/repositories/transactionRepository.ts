import { db as clientDb } from "@/lib/firebase";
import { doc, runTransaction, increment } from "firebase/firestore";
import { CanonicalRegistrationDoc, Collections, RegistrationStatus } from "../types/registrationTypes";
import { removeUndefinedFields, safeSetDoc } from "@/lib/firestoreUtils";
import { writeRepository } from "./writeRepository";
import { readRepository } from "./readRepository";

export const transactionRepository = {
  /**
   * Atomic Registration Transaction:
   * 1. Primary path: Calls /api/admin/registrations API route (server-side Admin SDK transaction).
   * 2. Fallback path: Executes Client SDK Firestore transaction / save operation.
   */
  async executeRegistrationTransaction(reg: CanonicalRegistrationDoc): Promise<CanonicalRegistrationDoc> {
    const regId = reg.id;
    const eventId = reg.eventId;

    // 1. Server API Route Transaction (Primary path - avoids bundling Node firebase-admin into browser JS)
    try {
      const res = await fetch("/api/admin/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reg),
      });

      const json = await res.json();
      if (res.status === 409 || json.code === "ALREADY_REGISTERED") {
        const dupErr: any = new Error(json.message || "You have already registered for this event.");
        dupErr.code = "ALREADY_REGISTERED";
        dupErr.status = 409;
        dupErr.registrationId = json.registrationId || regId;
        throw dupErr;
      }

      if (res.ok && json.success) {
        const serverData = (json.data as Record<string, any>) || {};
        const mergedDoc: CanonicalRegistrationDoc = {
          ...reg,
          registrationNumber: serverData.registrationNumber || reg.registrationNumber,
          verificationCode: serverData.verificationCode || reg.verificationCode,
          qrCodeUrl: serverData.qrCodeUrl || reg.qrCodeUrl,
          registeredAt: serverData.registeredAt || reg.registeredAt,
          createdAt: serverData.createdAt || reg.createdAt,
          updatedAt: serverData.updatedAt || reg.updatedAt,
        };
        console.log(`[transactionRepository] API success | regId: "${mergedDoc.id}" | userId: "${mergedDoc.userId}"`);
        return mergedDoc;
      } else {
        console.warn(`[transactionRepository] API call returned non-ok status ${res.status}: ${json.message}. Proceeding to Client SDK fallback write...`);
      }
    } catch (apiErr: any) {
      if (apiErr.code === "ALREADY_REGISTERED" || apiErr.status === 409) {
        throw apiErr;
      }
      console.warn("[transactionRepository] API Execution notice:", apiErr?.message || apiErr, ". Proceeding to Client SDK fallback write...");
    }

    // 2. Fallback path: Client SDK direct Firestore write (authenticated browser session)
    console.log(`[transactionRepository] Executing Client SDK fallback write for regId: "${regId}"`);
    try {
      const existing = await readRepository.getUserRegistration(eventId, reg.userId, reg.email);
      if (existing) {
        const dupErr: any = new Error("You have already registered for this event.");
        dupErr.code = "ALREADY_REGISTERED";
        dupErr.status = 409;
        dupErr.registrationId = existing.id;
        throw dupErr;
      }

      await writeRepository.saveRegistration(reg);
      console.log(`[transactionRepository] Client SDK fallback write SUCCESS ✓ | regId: "${regId}"`);
      return reg;
    } catch (clientErr: any) {
      console.error("[transactionRepository] Client SDK fallback write failed:", clientErr);
      throw clientErr;
    }
  },
};
