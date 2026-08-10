import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Collections, RegistrationStatus, PaymentStatus, buildRegistrationId } from "../types/registrationTypes";

export async function runRegistrationSchemaMigration(): Promise<{ total: number; migrated: number }> {
  console.log("[Schema Migration] Starting Phase 0 registration schema audit & migration...");
  let total = 0;
  let migrated = 0;

  try {
    const snap = await getDocs(collection(db, Collections.REGISTRATIONS));
    total = snap.docs.length;

    for (const d of snap.docs) {
      const data = d.data();
      const updates: Record<string, any> = {};

      if (!data.schemaVersion || data.schemaVersion < 2) {
        updates.schemaVersion = 2;
      }

      // Normalize status string to RegistrationStatus enum
      let rawStatus = (data.status || "CONFIRMED").toString().toUpperCase();
      if (rawStatus === "CONFIRMED" || rawStatus === "VERIFIED") updates.status = RegistrationStatus.CONFIRMED;
      else if (rawStatus === "CANCELLED" || rawStatus === "SOFT_CANCELLED") updates.status = RegistrationStatus.CANCELLED;
      else if (rawStatus === "PENDING PAYMENT" || rawStatus === "PENDING_PAYMENT" || rawStatus === "PENDING") updates.status = RegistrationStatus.PENDING_PAYMENT;
      else if (rawStatus === "REJECTED") updates.status = RegistrationStatus.REJECTED;

      // Ensure deterministic document metadata fields
      if (!data.registrationId) updates.registrationId = d.id;
      if (data.deleted === undefined) updates.deleted = false;
      if (data.isDeleted === undefined) updates.isDeleted = false;

      if (Object.keys(updates).length > 0) {
        const ref = doc(db, Collections.REGISTRATIONS, d.id);
        await updateDoc(ref, updates);
        migrated++;
      }
    }

    console.log(`[Schema Migration] Complete ✓ | Total checked: ${total} | Migrated: ${migrated}`);
  } catch (err) {
    console.warn("[Schema Migration] Notice (non-fatal):", err);
  }

  return { total, migrated };
}
