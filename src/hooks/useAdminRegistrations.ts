"use client";

import { useEffect, useState } from "react";
import { CanonicalRegistrationDoc } from "@/modules/registration/types/registrationTypes";
import { registrationService } from "@/services/registrationService";
import { useAuth } from "@/hooks/useAuth";

let globalAdminRegistrations: CanonicalRegistrationDoc[] = [];
let globalAdminListenersCount = 0;
let globalUnsubscribe: (() => void) | null = null;
const subscribers = new Set<(data: CanonicalRegistrationDoc[]) => void>();

function subscribeToAdminRegistrations(callback: (data: CanonicalRegistrationDoc[]) => void) {
  subscribers.add(callback);

  if (globalAdminListenersCount === 0) {
    console.log("[useAdminRegistrations] Spawning single shared Admin Firestore Listener");
    globalUnsubscribe = registrationService.subscribeRegistrations(
      (regs) => {
        globalAdminRegistrations = regs;
        subscribers.forEach((cb) => cb(regs));
      },
      (err) => {
        console.error("[useAdminRegistrations] Listener error:", err);
      }
    );
  }

  globalAdminListenersCount++;

  if (globalAdminRegistrations.length > 0) {
    callback(globalAdminRegistrations);
  }

  return () => {
    subscribers.delete(callback);
    globalAdminListenersCount--;
    if (globalAdminListenersCount <= 0) {
      console.log("[useAdminRegistrations] Closing single shared Admin Firestore Listener");
      if (globalUnsubscribe) {
        globalUnsubscribe();
        globalUnsubscribe = null;
      }
      globalAdminListenersCount = 0;
    }
  };
}

export function useAdminRegistrations() {
  const { role, loading: authLoading } = useAuth();
  const isAdmin = ["admin", "super_admin", "coordinator"].includes((role || "").toLowerCase());
  const [registrations, setRegistrations] = useState<CanonicalRegistrationDoc[]>(globalAdminRegistrations);
  const [loading, setLoading] = useState<boolean>(globalAdminRegistrations.length === 0);

  useEffect(() => {
    if (authLoading || !isAdmin) {
      setLoading(false);
      return;
    }

    const unsub = subscribeToAdminRegistrations((data) => {
      setRegistrations(data);
      setLoading(false);
    });
    return () => unsub();
  }, [authLoading, isAdmin]);

  return { registrations: isAdmin ? registrations : [], loading };
}
