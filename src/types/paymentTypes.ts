export enum RegistrationStatus {
  PENDING_PAYMENT = "PENDING_PAYMENT",
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  WAITLIST = "WAITLIST",
  REJECTED = "REJECTED",
}

export enum PaymentStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
  EXPIRED = "Expired",
}

export enum NotificationStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

export interface PaymentAuditEntry {
  action: string;
  admin?: string | null;
  remarks?: string | null;
  timestamp: string; // ISO string or server timestamp representation
}

export interface PaymentRecord {
  id: string; // paymentId == registrationId
  paymentId: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  userId: string | null;
  studentName: string;
  studentEmail: string;
  department?: string;
  year?: string;
  amount: number;
  transactionId: string; // UTR Number
  paymentMethod: "UPI" | "Bank Transfer" | "QR Code" | string;
  paymentScreenshotUrl: string;
  status: PaymentStatus | "Pending" | "Approved" | "Rejected" | "Expired";
  notificationStatus: NotificationStatus | "PENDING" | "SENT" | "FAILED";
  notificationRetryCount?: number;
  lastNotificationAttempt?: string | null;
  lastNotificationError?: string | null;
  processingBy?: string | null;
  processingStartedAt?: string | null;
  expiresAt?: string | null;
  history: PaymentAuditEntry[];
  remarks?: string | null;
  submittedAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByRole?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payment State Machine Transition Guard
 */
export function isValidStateTransition(
  current: PaymentStatus | string,
  target: PaymentStatus | string
): { valid: boolean; reason?: string } {
  const cur = (current || PaymentStatus.PENDING).toString();
  const tgt = (target || "").toString();

  if (cur === tgt) {
    if (cur === PaymentStatus.APPROVED) {
      return { valid: true, reason: "Already approved (Idempotent call)." };
    }
    return { valid: false, reason: `Payment is already in status "${cur}".` };
  }

  switch (cur) {
    case PaymentStatus.PENDING:
      if (tgt === PaymentStatus.APPROVED || tgt === PaymentStatus.REJECTED || tgt === PaymentStatus.EXPIRED) {
        return { valid: true };
      }
      return { valid: false, reason: `Cannot transition from Pending to ${tgt}.` };

    case PaymentStatus.REJECTED:
      if (tgt === PaymentStatus.PENDING) {
        return { valid: true }; // Student re-submitted proof
      }
      return { valid: false, reason: `Rejected payments must be re-submitted to Pending before approval.` };

    case PaymentStatus.APPROVED:
      return { valid: false, reason: `Approved payments cannot be modified or rejected.` };

    case PaymentStatus.EXPIRED:
      return { valid: false, reason: `Expired payment links cannot be approved.` };

    default:
      return { valid: true };
  }
}
