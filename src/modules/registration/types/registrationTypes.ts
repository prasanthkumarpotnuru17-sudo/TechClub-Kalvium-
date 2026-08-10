/**
 * Centralized Collections Registry
 */
export const Collections = {
  REGISTRATIONS: "registrations",
  EVENTS: "events",
  PAYMENTS: "payments",
  NOTIFICATIONS: "notifications",
  USERS: "users",
} as const;

/**
 * Standardized Registration Status Enum
 */
export enum RegistrationStatus {
  CONFIRMED = "CONFIRMED",
  PENDING_PAYMENT = "PENDING_PAYMENT",
  WAITLIST = "WAITLIST",
  CANCELLED = "CANCELLED",
  REJECTED = "REJECTED",
}

/**
 * Standardized Payment Status Enum
 */
export enum PaymentStatus {
  APPROVED = "Approved",
  PENDING = "Pending",
  REJECTED = "Rejected",
  EXPIRED = "Expired",
  NA = "N/A",
}

/**
 * Canonical Registration Document Interface (Schema Version 2)
 */
export interface CanonicalRegistrationDoc {
  id: string; // Deterministic ID: ${eventId}_${userId}
  registrationId: string; // Human-readable registration reference
  registrationNumber?: string; // Server-assigned sequential number (e.g., "TCM-2026-0001")
  eventId: string;
  eventName: string;
  userId: string | null;
  name: string; // Full student name
  studentName: string; // Canonical alias
  email: string; // Lowercased & trimmed
  department: string;
  year: string;
  status: RegistrationStatus | string;
  paymentStatus: PaymentStatus | string;
  paymentRequired: boolean;
  paymentId: string | null;
  registeredAt: string; // ISO string
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  deleted: boolean;
  isDeleted: boolean;
  source: string;
  verificationCode?: string;
  qrCodeUrl?: string;
  schemaVersion: number; // Currently 2
  teamMembers?: any[];
}

export interface EventRegistrationState {
  registration: CanonicalRegistrationDoc | null;
  payment: any | null;
  status: RegistrationStatus | "NOT_REGISTERED";
  canRegister: boolean;
  canEdit: boolean;
  canCancel: boolean;
  canViewPass: boolean;
}

export function buildRegistrationId(eventId: string, userId: string | null, email?: string): string {
  const safeEventId = (eventId || "").replace(/[^a-zA-Z0-9_-]/g, "_");
  const trimmedEmail = (email || "").toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, "_");
  const rawUserKey = (userId || trimmedEmail || "anon").trim();
  const safeUserKey = rawUserKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${safeEventId}_${safeUserKey}`;
}

export interface RegisterEventInput {
  eventId: string;
  eventName?: string;
  userId?: string | null;
  studentName: string;
  email: string;
  department?: string;
  year?: string;
  paymentRequired?: boolean;
  paymentId?: string | null;
  paymentStatus?: string;
  source?: string;
  teamMembers?: any[];
  [key: string]: any;
}
