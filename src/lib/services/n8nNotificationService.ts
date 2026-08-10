/**
 * Client Service for triggering the Master Notification API Entry Point.
 */

export interface NotificationPayload {
  type?: "welcome" | "event_registration" | "reminder" | "certificate" | "announcement" | "attendance" | string;
  notificationType?: string;
  userId?: string;
  email?: string;
  userEmail?: string;
  name?: string;
  fullName?: string;
  registrationId?: string;
  eventId?: string;
  event?: {
    title?: string;
    date?: string;
    time?: string;
    venue?: string;
  };
}

export interface NotificationDispatchResponse {
  success: boolean;
  message: string;
  data?: {
    notificationId: string;
    notificationType?: string;
    type?: string;
    status: string;
    recipient: string;
  };
  error?: string;
}

export const n8nNotificationService = {
  /**
   * Generic dispatch method to trigger the Next.js API notification route.
   */
  async dispatchNotification(payload: NotificationPayload): Promise<NotificationDispatchResponse> {
    try {
      const formattedType = payload.type || (payload.notificationType ? payload.notificationType.toLowerCase().replace(/[^a-z0-9]/g, "_") : "welcome");
      const response = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          type: formattedType,
          notificationType: formattedType,
        }),
      });

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error("[n8nNotificationService] Dispatch Error:", err);
      return {
        success: false,
        message: "Failed to dispatch notification request",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Trigger Welcome Email (First Login)
   */
  async dispatchWelcomeEmail(userId: string, email?: string, name?: string): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "welcome",
      userId,
      email,
      name,
    });
  },

  /**
   * Trigger Event Registration Confirmation Email
   */
  async dispatchEventRegistrationConfirmation(
    registrationId: string,
    eventId: string,
    userId?: string,
    email?: string,
    name?: string
  ): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "event_registration",
      registrationId,
      eventId,
      userId,
      email,
      name,
    });
  },

  /**
   * Trigger Event Reminder Email
   */
  async dispatchReminder(eventId: string, userId: string): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "reminder",
      eventId,
      userId,
    });
  },

  /**
   * Trigger Certificate Issued Email
   */
  async dispatchCertificate(eventId: string, userId: string): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "certificate",
      eventId,
      userId,
    });
  },

  /**
   * Trigger Attendance Confirmation Email
   */
  async dispatchAttendanceConfirmation(payload: Partial<NotificationPayload>): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "attendance_confirmation",
      ...payload,
    });
  },

  /**
   * Trigger Event Cancellation Email
   */
  async dispatchCancellation(payload: Partial<NotificationPayload>): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "event_cancelled",
      ...payload,
    });
  },

  /**
   * Trigger Event Rescheduled Email
   */
  async dispatchRescheduled(payload: Partial<NotificationPayload>): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "event_rescheduled",
      ...payload,
    });
  },

  /**
   * Trigger Global Announcement Email
   */
  async dispatchAnnouncement(eventId?: string): Promise<NotificationDispatchResponse> {
    return this.dispatchNotification({
      type: "announcement",
      eventId,
    });
  }
};
