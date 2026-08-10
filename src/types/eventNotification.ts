/**
 * Event Registration Notification Interfaces & Types
 */

export type NotificationStatus = "pending" | "sending" | "sent" | "failed";

export interface NotificationStatusState {
  status: NotificationStatus;
  sentAt: string | null;
  attempts: number;
  error: string | null;
  lastAttemptAt?: string | null;
}

export interface EventRegistrationNotificationRequest {
  registrationId: string;
  eventId?: string;
  userId?: string;
  email?: string;
  userEmail?: string;
  name?: string;
  fullName?: string;
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  event?: {
    title?: string;
    date?: string;
    time?: string;
    venue?: string;
  };
}

export interface N8nEventRegistrationPayload {
  type: "event_registration";
  userId: string;
  email: string;
  name: string;
  eventId: string;
  registrationId: string;
  event: {
    title: string;
    date: string;
    time: string;
    venue: string;
  };
  buttonText: string;
  buttonLink: string;
}

export interface N8nEventReminderPayload {
  type: "event_reminder";
  email: string;
  name: string;
  event: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue: string;
  };
  button: {
    text: string;
    url: string;
  };
}

export interface N8nAttendanceConfirmationPayload {
  type: "attendance_confirmation";
  email: string;
  name: string;
  event: {
    title: string;
    date: string;
  };
  button: {
    text: string;
    url: string;
  };
}

export interface N8nCertificatePayload {
  type: "certificate";
  email: string;
  name: string;
  certificate: {
    eventName: string;
    issueDate: string;
  };
  button: {
    text: string;
    url: string;
  };
}

export interface N8nEventCancelledPayload {
  type: "event_cancelled";
  email: string;
  name: string;
  event: {
    title: string;
    date: string;
    reason: string;
  };
}

export interface N8nEventRescheduledPayload {
  type: "event_rescheduled";
  email: string;
  name: string;
  event: {
    title: string;
    oldDate: string;
    newDate: string;
    oldTime: string;
    newTime: string;
    venue: string;
  };
}

export interface EventRegistrationNotificationResponse {
  success: boolean;
  message: string;
  skipped?: boolean;
  data?: {
    registrationId: string;
    eventId: string;
    recipientEmail: string;
    recipientName: string;
    status: NotificationStatus;
    sentAt: string | null;
  } | null;
  error?: string | null;
}
