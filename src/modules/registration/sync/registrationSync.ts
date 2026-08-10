import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { registrationConverter } from "../converters/registrationConverter";
import { CanonicalRegistrationDoc, Collections } from "../types/registrationTypes";
import { registrationStore } from "./registrationStore";
import { readRepository } from "../repositories/readRepository";

/**
 * Shared Realtime Subscription Manager
 * Maintains single-source-of-truth Firestore stream and updates RegistrationStore.
 */
export const registrationSync = {
  subscribeUserRegistrations(
    userId: string,
    email: string,
    callback: (regs: CanonicalRegistrationDoc[]) => void,
    onError?: (err: any) => void
  ): () => void {
    let regsByUid: CanonicalRegistrationDoc[] = [];
    let regsByEmail: CanonicalRegistrationDoc[] = [];
    let apiRegs: CanonicalRegistrationDoc[] = [];

    let regsByUserEmail: CanonicalRegistrationDoc[] = [];

    const mergeAndEmit = () => {
      const allMap = new Map<string, CanonicalRegistrationDoc>();
      // 1. Preserve active items in store first
      registrationStore.getRegistrations().forEach((r) => allMap.set(r.id, r));
      // 2. Layer items from initial API read
      apiRegs.forEach((r) => allMap.set(r.id, r));
      // 3. Layer items from live Firestore listeners
      regsByUid.forEach((r) => allMap.set(r.id, r));
      regsByEmail.forEach((r) => allMap.set(r.id, r));
      regsByUserEmail.forEach((r) => allMap.set(r.id, r));

      const activeList = Array.from(allMap.values()).filter(
        (r) =>
          !r.deleted &&
          !r.isDeleted &&
          r.status !== "CANCELLED" &&
          r.status !== "Cancelled" &&
          r.status !== "cancelled"
      );
      console.log(
        `[registrationSync] mergeAndEmit | userId: "${userId}" | apiRegs: ${apiRegs.length} | byUid: ${regsByUid.length} | byEmail: ${regsByEmail.length} | active: ${activeList.length}`
      );
      registrationStore.setRegistrations(activeList);
      callback(activeList);
    };

    // Initial one-time read to populate immediately before listeners fire
    console.log(`[registrationSync] Starting initial GET for userId: "${userId}", email: "${email}"`);
    readRepository.getUserRegistrations(userId, email).then((items) => {
      console.log(`[registrationSync] Initial GET returned ${items.length} registrations for userId: "${userId}"`);
      apiRegs = items;
      mergeAndEmit();
    }).catch((err) => {
      console.warn(`[registrationSync] Initial GET failed for userId: "${userId}"`, err);
      mergeAndEmit();
    });

    const unsubscribers: Array<() => void> = [];

    if (userId) {
      console.log(`[registrationSync] Setting up onSnapshot(userId) listener | userId: "${userId}"`);
      const qUid = query(
        collection(db, Collections.REGISTRATIONS),
        where("userId", "==", userId)
      ).withConverter(registrationConverter);

      const unsubUid = onSnapshot(
        qUid,
        (snap) => {
          regsByUid = snap.docs.map((d) => d.data());
          console.log(`[registrationSync] onSnapshot(userId) fired | userId: "${userId}" | docs: ${snap.docs.length}`);
          mergeAndEmit();
        },
        (err) => {
          console.error(`[registrationSync] onSnapshot(userId) ERROR | userId: "${userId}"`, err);
          onError && onError(err);
        }
      );
      unsubscribers.push(unsubUid);
    }

    const trimmedEmail = (email || "").toLowerCase().trim();
    if (trimmedEmail) {
      console.log(`[registrationSync] Setting up onSnapshot(email) listener | email: "${trimmedEmail}"`);
      const qEmail = query(
        collection(db, Collections.REGISTRATIONS),
        where("email", "==", trimmedEmail)
      ).withConverter(registrationConverter);

      const unsubEmail = onSnapshot(
        qEmail,
        (snap) => {
          regsByEmail = snap.docs.map((d) => d.data());
          console.log(`[registrationSync] onSnapshot(email) fired | email: "${trimmedEmail}" | docs: ${snap.docs.length}`);
          mergeAndEmit();
        },
        (err) => {
          console.error(`[registrationSync] onSnapshot(email) ERROR | email: "${trimmedEmail}"`, err);
          onError && onError(err);
        }
      );
      unsubscribers.push(unsubEmail);

      const qUserEmail = query(
        collection(db, Collections.REGISTRATIONS),
        where("userEmail", "==", trimmedEmail)
      ).withConverter(registrationConverter);

      const unsubUserEmail = onSnapshot(
        qUserEmail,
        (snap) => {
          regsByUserEmail = snap.docs.map((d) => d.data());
          console.log(`[registrationSync] onSnapshot(userEmail) fired | email: "${trimmedEmail}" | docs: ${snap.docs.length}`);
          mergeAndEmit();
        },
        (err) => {
          console.error(`[registrationSync] onSnapshot(userEmail) ERROR | email: "${trimmedEmail}"`, err);
          onError && onError(err);
        }
      );
      unsubscribers.push(unsubUserEmail);
    }

    return () => {
      console.log(`[registrationSync] Unsubscribing user listeners | userId: "${userId}"`);
      unsubscribers.forEach((fn) => fn());
    };
  },

  subscribeAllRegistrations(
    callback: (regs: CanonicalRegistrationDoc[]) => void,
    onError?: (err: any) => void
  ): () => void {
    const q = query(collection(db, Collections.REGISTRATIONS)).withConverter(registrationConverter);
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data()).filter((r) => !r.deleted && !r.isDeleted);
        // IMPORTANT: Do NOT call registrationStore.setRegistrations here.
        // The singleton store is scoped to the current user's registrations.
        callback(list);
      },
      async (err) => {
        console.warn("[registrationSync] subscribeAllRegistrations notice (permission check for non-admin):", err?.message || err);
        try {
          const res = await fetch("/api/admin/registrations");
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              callback(json.data);
              return;
            }
          }
        } catch (apiErr) {
          // Ignore API error
        }
        callback([]);
        if (onError) onError(err);
      }
    );
  },
};
