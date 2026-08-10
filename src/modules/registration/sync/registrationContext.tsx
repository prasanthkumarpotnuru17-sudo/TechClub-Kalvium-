"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  CanonicalRegistrationDoc,
  RegistrationStatus,
  EventRegistrationState,
} from "../types/registrationTypes";
import { registrationSync } from "./registrationSync";
import { registrationStore } from "./registrationStore";
import { registrationService } from "@/services/registrationService";
import { useAuth } from "@/hooks/useAuth";

export interface RegistrationContextValue {
  registrations: CanonicalRegistrationDoc[];
  loading: boolean;
  registeredEventsMap: Map<string, CanonicalRegistrationDoc>;
  registeredEventIds: Set<string>;

  // Shared Helper Selectors
  isRegistered: (eventId: string) => boolean;
  getRegistration: (eventId: string) => CanonicalRegistrationDoc | null;
  getEventRegistrationState: (eventId: string) => EventRegistrationState;
  getUpcomingRegistrations: () => CanonicalRegistrationDoc[];
  getCancelledRegistrations: () => CanonicalRegistrationDoc[];
  getConfirmedRegistrations: () => CanonicalRegistrationDoc[];
  getPendingRegistrations: () => CanonicalRegistrationDoc[];

  // Actions
  cancelRegistration: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const defaultState: EventRegistrationState = {
  registration: null,
  payment: null,
  status: "NOT_REGISTERED",
  canRegister: true,
  canEdit: false,
  canCancel: false,
  canViewPass: false,
};

const RegistrationContext = createContext<RegistrationContextValue>({
  registrations: [],
  loading: true,
  registeredEventsMap: new Map(),
  registeredEventIds: new Set(),
  isRegistered: () => false,
  getRegistration: () => null,
  getEventRegistrationState: () => defaultState,
  getUpcomingRegistrations: () => [],
  getCancelledRegistrations: () => [],
  getConfirmedRegistrations: () => [],
  getPendingRegistrations: () => [],
  cancelRegistration: async () => {},
  refresh: async () => {},
});

export const RegistrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [registrations, setRegistrations] = useState<CanonicalRegistrationDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserRegistrations = useCallback(async () => {
    const userId = user?.uid || (user as any)?.id || "";
    let email = user?.email || "";
    if (!email && typeof window !== "undefined") {
      email = localStorage.getItem("last_registered_email") || "";
    }
    if (!userId && !email) {
      setRegistrations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const items = await registrationService.getUserRegistrations(userId, email);
      setRegistrations(items);
    } catch (err) {
      console.warn("[RegistrationContext] Manual refresh failed:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    const userId = user?.uid || (user as any)?.id || "";
    let email = user?.email || "";
    if (!email && typeof window !== "undefined") {
      email = localStorage.getItem("last_registered_email") || "";
    }

    console.log(`[RegistrationContext] [REG-INIT STEP 6] Auth resolved | userId: "${userId}" | email: "${email}"`);

    if (!userId && !email) {
      console.log("[RegistrationContext] No userId/email — clearing registrations.");
      setRegistrations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubStore = registrationStore.subscribe((storeRegs) => {
      setRegistrations(storeRegs);
      setLoading(false);
    });

    const unsubSync = registrationSync.subscribeUserRegistrations(
      userId,
      email,
      (regs) => {
        console.log(`[RegistrationContext] [REG-SYNC STEP 6] Stream update | count: ${regs.length}`);
        setRegistrations(regs);
        setLoading(false);
      },
      (err) => {
        console.error(`[RegistrationContext] ERROR | userId: "${userId}"`, err);
        setLoading(false);
      }
    );

    return () => {
      unsubStore();
      unsubSync();
    };
  }, [authLoading, user?.uid, user?.email]);

  // Exclude cancelled registrations from active maps (map by eventId, eventName lowercased, and document ID)
  const registeredEventsMap = useMemo(() => {
    const map = new Map<string, CanonicalRegistrationDoc>();
    registrations.forEach((r) => {
      if (
        !r.deleted &&
        !r.isDeleted &&
        r.status !== RegistrationStatus.CANCELLED &&
        (r.status as string) !== "Cancelled"
      ) {
        if (r.eventId) map.set(r.eventId, r);
        if (r.eventName) map.set(r.eventName.toLowerCase().trim(), r);
        if (r.id) map.set(r.id, r);
      }
    });
    return map;
  }, [registrations]);

  const registeredEventIds = useMemo(() => {
    const ids = new Set<string>();
    registrations.forEach((r) => {
      if (
        !r.deleted &&
        !r.isDeleted &&
        r.status !== RegistrationStatus.CANCELLED &&
        (r.status as string) !== "Cancelled"
      ) {
        if (r.eventId) ids.add(r.eventId);
        if (r.eventName) ids.add(r.eventName.toLowerCase().trim());
      }
    });
    return ids;
  }, [registrations]);

  const getRegistration = useCallback(
    (eventIdOrTitle: string) => {
      if (!eventIdOrTitle) return null;
      const targetLower = eventIdOrTitle.toLowerCase().trim();
      const reg = registrations.find((r) => {
        if (
          r.deleted ||
          r.isDeleted ||
          r.status === RegistrationStatus.CANCELLED ||
          (r.status as string) === "Cancelled"
        ) {
          return false;
        }
        const matchesEventId = r.eventId && (r.eventId === eventIdOrTitle || r.eventId.toLowerCase().trim() === targetLower);
        const matchesDocId = r.id && (r.id === eventIdOrTitle || r.id.startsWith(eventIdOrTitle));
        const matchesEventName = r.eventName && r.eventName.toLowerCase().trim() === targetLower;
        return matchesEventId || matchesDocId || matchesEventName;
      });
      return reg || null;
    },
    [registrations]
  );

  const isRegistered = useCallback(
    (eventId: string) => {
      return !!getRegistration(eventId);
    },
    [getRegistration]
  );

  const getEventRegistrationState = useCallback(
    (eventId: string): EventRegistrationState => {
      const reg = getRegistration(eventId);
      if (!reg) {
        return {
          registration: null,
          payment: null,
          status: "NOT_REGISTERED",
          canRegister: true,
          canEdit: false,
          canCancel: false,
          canViewPass: false,
        };
      }

      const isConfirmed =
        reg.status === RegistrationStatus.CONFIRMED ||
        reg.status === "Confirmed" ||
        reg.paymentStatus === "Verified";
      const isCancelled =
        reg.status === RegistrationStatus.CANCELLED ||
        reg.status === "Cancelled";

      return {
        registration: reg,
        payment: null,
        status: (reg.status as RegistrationStatus) || RegistrationStatus.CONFIRMED,
        canRegister: isCancelled,
        canEdit: !isCancelled,
        canCancel: !isCancelled,
        canViewPass: !isCancelled && (isConfirmed || !reg.paymentRequired),
      };
    },
    [getRegistration]
  );

  const getUpcomingRegistrations = useCallback(() => {
    return registrations.filter(
      (r) =>
        !r.deleted &&
        !r.isDeleted &&
        r.status !== RegistrationStatus.CANCELLED &&
        (r.status as string) !== "Cancelled" &&
        (r as any).attendance !== "Attended"
    );
  }, [registrations]);

  const getCancelledRegistrations = useCallback(() => {
    return registrations.filter(
      (r) =>
        r.status === RegistrationStatus.CANCELLED ||
        (r.status as string) === "Cancelled"
    );
  }, [registrations]);

  const getConfirmedRegistrations = useCallback(() => {
    return registrations.filter(
      (r) =>
        !r.deleted &&
        !r.isDeleted &&
        (r.status === RegistrationStatus.CONFIRMED || (r.status as string) === "Confirmed")
    );
  }, [registrations]);

  const getPendingRegistrations = useCallback(() => {
    return registrations.filter(
      (r) =>
        !r.deleted &&
        !r.isDeleted &&
        (r.status === RegistrationStatus.PENDING_PAYMENT ||
          r.paymentStatus === "Pending" ||
          (r.status as string) === "Payment Pending")
    );
  }, [registrations]);

  const cancelRegistration = useCallback(async (id: string) => {
    console.log(`[RegistrationContext] [REG-CANCEL STEP 1] Initiating cancellation for registration ${id}`);
    await registrationService.cancelRegistration(id);
    setRegistrations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: RegistrationStatus.CANCELLED } : r))
    );
  }, []);

  return (
    <RegistrationContext.Provider
      value={{
        registrations,
        loading,
        registeredEventsMap,
        registeredEventIds,
        isRegistered,
        getRegistration,
        getEventRegistrationState,
        getUpcomingRegistrations,
        getCancelledRegistrations,
        getConfirmedRegistrations,
        getPendingRegistrations,
        cancelRegistration,
        refresh: fetchUserRegistrations,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
};

export const useRegistrations = () => useContext(RegistrationContext);
