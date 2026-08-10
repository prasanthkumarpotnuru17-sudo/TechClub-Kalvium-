import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc, getDoc, runTransaction, increment } from "firebase/firestore";
import { safeSetDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { registrationConverter } from "../converters/registrationConverter";
import { CanonicalRegistrationDoc, Collections } from "../types/registrationTypes";

export const writeRepository = {
  /**
   * Save or merge a canonical registration document into Firestore
   */
  async saveRegistration(reg: CanonicalRegistrationDoc): Promise<void> {
    const cleanDoc = removeUndefinedFields(reg);
    const ref = doc(db, Collections.REGISTRATIONS, reg.id).withConverter(registrationConverter);
    await safeSetDoc(ref, cleanDoc as CanonicalRegistrationDoc, { merge: true });
  },

  async updateRegistration(id: string, updates: Partial<CanonicalRegistrationDoc>): Promise<void> {
    const nowIso = new Date().toISOString();
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: nowIso,
    });
    const ref = doc(db, Collections.REGISTRATIONS, id).withConverter(registrationConverter);
    await safeSetDoc(ref, cleanUpdates as CanonicalRegistrationDoc, { merge: true });
  },

  /**
   * Soft-cancel a registration document and decrement the event registeredCount atomically.
   * Returns the cancelled registration's eventId so the caller can update event state.
   */
  async cancelRegistration(id: string): Promise<{ eventId: string }> {
    const nowIso = new Date().toISOString();

    // Run as a transaction to atomically cancel + decrement event count
    let eventId = "";
    await runTransaction(db, async (transaction) => {
      const regRef = doc(db, Collections.REGISTRATIONS, id);
      const regDoc = await transaction.get(regRef);

      if (!regDoc.exists()) {
        throw new Error("Registration not found.");
      }

      const regData = regDoc.data()!;
      eventId = regData.eventId || "";
      const wasConfirmed =
        regData.status === "Confirmed" ||
        regData.status === "CONFIRMED" ||
        regData.status === "confirmed";

      // Soft-cancel the registration
      transaction.update(regRef, {
        status: "CANCELLED",
        isDeleted: false,
        deleted: false,
        cancelledAt: nowIso,
        updatedAt: nowIso,
      });

      // Decrement event registeredCount if was a confirmed seat
      if (wasConfirmed && eventId) {
        const eventRef = doc(db, Collections.EVENTS, eventId);
        const eventDoc = await transaction.get(eventRef);
        if (eventDoc.exists()) {
          const currentCount = eventDoc.data()!.registeredCount || 0;
          transaction.update(eventRef, {
            registeredCount: Math.max(0, currentCount - 1),
            updatedAt: nowIso,
          });
        }
      }
    });

    return { eventId };
  },

  /**
   * Hard delete a registration document (Admin only)
   */
  async deleteRegistration(id: string): Promise<void> {
    const ref = doc(db, Collections.REGISTRATIONS, id);
    await deleteDoc(ref);
  },
};
