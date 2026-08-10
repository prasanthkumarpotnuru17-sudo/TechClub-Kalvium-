export enum NotificationType {
  WELCOME = "WELCOME",
  EVENT_REGISTRATION = "EVENT_REGISTRATION",
  ATTENDANCE = "ATTENDANCE",
  REMINDER = "REMINDER",
  CERTIFICATE = "CERTIFICATE",
  ANNOUNCEMENT = "ANNOUNCEMENT",
  CANCELLATION = "CANCELLATION",
  RESCHEDULED = "RESCHEDULED",
  CONTACT_MESSAGE = "CONTACT_MESSAGE",
  PAYMENT_SUBMITTED = "PAYMENT_SUBMITTED",
  PAYMENT_APPROVED = "PAYMENT_APPROVED",
  PAYMENT_REJECTED = "PAYMENT_REJECTED"
}

export interface StandardNotificationPayload {
  correlationId?: string;
  type: string; // lowercase snake_case for backward compatibility, e.g. "welcome", "event_registration"
  notificationType: NotificationType; // UPPERCASE enum value for n8n routing
  userId?: string | null;
  email?: string | null;
  userEmail?: string | null;
  name?: string | null;
  fullName?: string | null;
  subject?: string | null;
  registrationId?: string | null;
  eventId?: string | null;
  event?: {
    id?: string;
    title?: string;
    date?: string;
    time?: string;
    venue?: string;
    reason?: string;
    cancelledBy?: string;
    cancelledAt?: string;
    oldDate?: string;
    newDate?: string;
    oldTime?: string;
    newTime?: string;
  };
  studentName?: string | null;
  studentEmail?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  venue?: string | null;
  reason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  certificate?: {
    eventName?: string;
    issueDate?: string;
    certificateNumber?: string;
    verificationCode?: string;
    pdfBase64?: string;
    fileName?: string;
  };
  announcement?: {
    title?: string;
    message?: string;
    category?: string;
    priority?: string;
    publishedAt?: string;
  };
  contactMessage?: {
    id?: string;
    messageId?: string;
    fullName?: string;
    email?: string;
    subject?: string;
    message?: string;
    status?: string;
    priority?: string;
    createdAt?: string;
  };
  payment?: {
    paymentId?: string;
    amount?: number;
    transactionId?: string;
    status?: string;
    remarks?: string | null;
    submittedAt?: string;
  };
  recipients?: Array<{ email: string; name: string }>;
  button?: {
    text?: string;
    url?: string;
  };
  customData?: Record<string, any>;
}

export interface DispatchResult {
  success: boolean;
  correlationId: string;
  notificationType: NotificationType;
  webhookUrl: string;
  attempts: number;
  httpStatus?: number;
  message: string;
  error?: string | null;
}
