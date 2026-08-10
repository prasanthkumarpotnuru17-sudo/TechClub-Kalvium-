import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { registrationConverter } from "../converters/registrationConverter";
import { CanonicalRegistrationDoc, Collections, RegistrationStatus, buildRegistrationId } from "../types/registrationTypes";

export const readRepository = {
  /**
   * Fetch a single registration document by ID using Firestore Data Converter
   */
  async getRegistrationById(id: string): Promise<CanonicalRegistrationDoc | null> {
    try {
      const ref = doc(db, Collections.REGISTRATIONS, id).withConverter(registrationConverter);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.warn(`[readRepository] Error reading registration ${id}:`, err);
      return null;
    }
  },

  async getUserRegistrations(userId: string, email: string): Promise<CanonicalRegistrationDoc[]> {
    const itemsMap = new Map<string, CanonicalRegistrationDoc>();
    const trimmedEmail = (email || "").toLowerCase().trim();

    try {
      // 1. Primary API route query (uses server Admin SDK to reliably bypass rule edge cases)
      if (userId || trimmedEmail) {
        const res = await fetch(
          `/api/user/registrations?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(trimmedEmail)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            json.data.forEach((r: any) => {
              itemsMap.set(r.id, registrationConverter.fromFirestore({ data: () => r, id: r.id } as any, {}));
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn("[readRepository] API fetch notice:", apiErr);
    }

    try {
      // 2. Client SDK query by userId
      if (userId) {
        const qUid = query(
          collection(db, Collections.REGISTRATIONS),
          where("userId", "==", userId)
        ).withConverter(registrationConverter);
        const snapUid = await getDocs(qUid);
        snapUid.forEach((d) => itemsMap.set(d.id, d.data()));
      }

      // 3. Client SDK query by lowercased email and userEmail
      if (trimmedEmail) {
        const qEmail = query(
          collection(db, Collections.REGISTRATIONS),
          where("email", "==", trimmedEmail)
        ).withConverter(registrationConverter);
        const snapEmail = await getDocs(qEmail);
        snapEmail.forEach((d) => itemsMap.set(d.id, d.data()));

        const qUserEmail = query(
          collection(db, Collections.REGISTRATIONS),
          where("userEmail", "==", trimmedEmail)
        ).withConverter(registrationConverter);
        const snapUserEmail = await getDocs(qUserEmail);
        snapUserEmail.forEach((d) => itemsMap.set(d.id, d.data()));
      }
    } catch (err) {
      console.warn("[readRepository] Error fetching user registrations:", err);
    }

    return Array.from(itemsMap.values()).filter((r) => !r.deleted && !r.isDeleted);
  },

  /**
   * Fetch all registrations across all users
   */
  async getAllRegistrations(): Promise<CanonicalRegistrationDoc[]> {
    try {
      const q = query(collection(db, Collections.REGISTRATIONS)).withConverter(registrationConverter);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data()).filter((r) => !r.deleted && !r.isDeleted);
    } catch (err) {
      console.warn("[readRepository] Error fetching all registrations:", err);
      return [];
    }
  },

  /**
   * Fetch registrations for a specific event ID
   */
  async getRegistrationsByEventId(eventId: string): Promise<CanonicalRegistrationDoc[]> {
    try {
      const q = query(
        collection(db, Collections.REGISTRATIONS),
        where("eventId", "==", eventId)
      ).withConverter(registrationConverter);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data()).filter((r) => !r.deleted && !r.isDeleted);
    } catch (err) {
      console.warn(`[readRepository] Error fetching registrations for event ${eventId}:`, err);
      return [];
    }
  },

  /**
   * Fetch a single user registration for a specific event (by userId or email)
   */
  async getUserRegistration(eventId: string, userId?: string | null, email?: string | null): Promise<CanonicalRegistrationDoc | null> {
    try {
      // 1. Direct single-doc GET by deterministic ID (uses allow get rule - 100% allowed for students)
      const deterministicId = buildRegistrationId(eventId, userId || null, email || "");
      if (deterministicId) {
        const docRef = doc(db, Collections.REGISTRATIONS, deterministicId).withConverter(registrationConverter);
        const singleSnap = await getDoc(docRef);
        if (singleSnap.exists()) {
          const docData = singleSnap.data();
          if (!docData.deleted && !docData.isDeleted && docData.status !== RegistrationStatus.CANCELLED && (docData.status as string) !== "Cancelled") {
            return docData;
          }
        }
      }

      // 2. Check user-scoped registrations list
      const allUserRegs = await this.getUserRegistrations(userId || "", email || "");
      const matched = allUserRegs.find(
        (r) =>
          (r.eventId === eventId || (r as any).eventName?.toLowerCase() === eventId.toLowerCase()) &&
          !r.deleted &&
          !r.isDeleted &&
          r.status !== RegistrationStatus.CANCELLED &&
          (r.status as string) !== "Cancelled"
      );
      if (matched) return matched;

      return null;
    } catch (err) {
      console.warn(`[readRepository] Error fetching user registration for event ${eventId}:`, err);
      return null;
    }
  },
};
