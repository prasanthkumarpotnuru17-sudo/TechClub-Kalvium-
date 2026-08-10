import {
  CanonicalRegistrationDoc,
  RegisterEventInput,
  RegistrationStatus,
  PaymentStatus,
  buildRegistrationId,
} from "../types/registrationTypes";

/**
 * Pre-Write Data Normalizer
 * Enforces clean, trimmed, lowercased top-level properties BEFORE writing to Firestore.
 */
export function normalizeRegistrationInput(
  input: RegisterEventInput,
  existingDocId?: string
): CanonicalRegistrationDoc {
  const nowIso = new Date().toISOString();
  const trimmedEmail = (input.email || input.userEmail || "").toLowerCase().trim();
  const trimmedName = (input.studentName || input.name || input.fullName || "Participant").trim();
  const userId = input.userId || null;
  const docId = existingDocId || buildRegistrationId(input.eventId, userId, trimmedEmail);

  const yearStr = new Date().getFullYear().toString();
  const regNumber = `TCM-${yearStr}-${String(Date.now()).slice(-4)}`;
  const verificationCode = `VERIFIED-${regNumber}-${Date.now().toString().slice(-6)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(verificationCode)}`;

  const isPaid = input.paymentRequired === true;
  const defaultStatus = isPaid ? RegistrationStatus.PENDING_PAYMENT : RegistrationStatus.CONFIRMED;
  const defaultPaymentStatus = isPaid ? PaymentStatus.PENDING : PaymentStatus.NA;

  return {
    ...input,
    id: docId,
    registrationId: docId,
    eventId: input.eventId,
    eventName: (input.eventName || input.eventTitle || "Tech Club Event").trim(),
    userId: userId,
    name: trimmedName,
    studentName: trimmedName,
    email: trimmedEmail,
    department: (input.department || "").trim(),
    year: (input.year || "").trim(),
    status: input.status || defaultStatus,
    paymentStatus: input.paymentStatus || defaultPaymentStatus,
    paymentRequired: isPaid,
    paymentId: input.paymentId || (isPaid ? `pay_${docId}` : null),
    registeredAt: input.registeredAt || nowIso,
    createdAt: input.createdAt || nowIso,
    updatedAt: nowIso,
    deleted: false,
    isDeleted: false,
    source: input.source || "website",
    verificationCode: input.verificationCode || verificationCode,
    qrCodeUrl: input.qrCodeUrl || qrCodeUrl,
    schemaVersion: 2,
    teamMembers: input.teamMembers || [],
  };
}

/**
 * Validates allowed state transitions for registrations
 */
export function isValidRegistrationTransition(
  current: RegistrationStatus | string,
  target: RegistrationStatus | string
): { valid: boolean; reason?: string } {
  const cur = (current || RegistrationStatus.CONFIRMED).toString();
  const tgt = (target || "").toString();

  if (cur === tgt) return { valid: true };

  if (cur === RegistrationStatus.CANCELLED) {
    return { valid: false, reason: "Cancelled registrations cannot be updated." };
  }

  return { valid: true };
}
