import { userService } from "./userService";

/**
 * Unified Notification Service for triggering Next.js notification API routes.
 * Serves as the single client/server interface for all notification types in the application.
 */

export interface NotificationServiceResponse {
  success: boolean;
  message: string;
  skipped?: boolean;
  data?: any;
  error?: string | null;
}

async function safeFetchJson(res: Response): Promise<NotificationServiceResponse> {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    console.error(`[NotificationService] Received non-JSON response (${res.status}):`, text.substring(0, 300));
    return {
      success: false,
      message: `Server error (${res.status}).`,
      error: `HTTP ${res.status}: ${text.substring(0, 150)}`
    };
  }
  return await res.json();
}

export interface EventReminderDetails {
  eventId?: string;
  userId?: string;
  email?: string;
  name?: string;
  event?: {
    id?: string;
    title: string;
    date: string;
    time?: string;
    venue?: string;
  };
  buttonUrl?: string;
}

export interface AttendanceConfirmationDetails {
  userId?: string;
  email?: string;
  name?: string;
  event?: {
    title: string;
    date: string;
  };
  eventName?: string;
  eventDate?: string;
  buttonUrl?: string;
}

export interface CertificateNotificationDetails {
  userId?: string;
  email?: string;
  name?: string;
  certificate?: {
    eventName: string;
    issueDate: string;
  };
  eventName?: string;
  issueDate?: string;
  buttonUrl?: string;
}

export interface EventCancellationDetails {
  userId?: string;
  email?: string;
  name?: string;
  event?: {
    title: string;
    date: string;
    reason?: string;
  };
  eventName?: string;
  eventDate?: string;
  reason?: string;
}

export interface EventRescheduledDetails {
  userId?: string;
  email?: string;
  name?: string;
  event?: {
    title: string;
    oldDate: string;
    newDate: string;
    oldTime?: string;
    newTime?: string;
    venue?: string;
  };
  eventName?: string;
  oldDate?: string;
  newDate?: string;
  oldTime?: string;
  newTime?: string;
  venue?: string;
}

export const notificationService = {
  /**
   * Triggers Welcome Email (Phase 1)
   */
  async sendWelcomeEmail(
    userId: string,
    userEmail: string,
    fullName?: string
  ): Promise<NotificationServiceResponse> {
    try {
      const res = await fetch("/api/notifications/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: userEmail,
          userEmail,
          name: fullName,
          fullName,
          type: "welcome"
        }),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendWelcomeEmail error:", err);
      return {
        success: false,
        message: "Failed to dispatch welcome email request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Event Registration Confirmation Email (Phase 2)
   */
  async sendEventRegistrationEmail(
    registrationId: string,
    eventId?: string,
    userId?: string,
    details?: {
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
  ): Promise<NotificationServiceResponse> {
    try {
      const email = details?.email || details?.userEmail;
      const name = details?.name || details?.fullName;
      const eventObj = details?.event || (details?.eventName ? {
        title: details.eventName,
        date: details.eventDate,
        time: details.eventTime,
        venue: details.eventVenue
      } : undefined);

      const res = await fetch("/api/notifications/event-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          eventId,
          userId,
          type: "event_registration",
          email,
          userEmail: email,
          name,
          fullName: name,
          eventName: eventObj?.title || details?.eventName,
          eventDate: eventObj?.date || details?.eventDate,
          eventTime: eventObj?.time || details?.eventTime,
          eventVenue: eventObj?.venue || details?.eventVenue,
          event: eventObj
        }),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendEventRegistrationEmail error:", err);
      return {
        success: false,
        message: "Failed to dispatch event registration confirmation email request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Event Reminder Notification
   */
  async sendReminder(
    eventIdOrDetails: string | EventReminderDetails,
    userId?: string
  ): Promise<NotificationServiceResponse> {
    try {
      let payload: any;
      if (typeof eventIdOrDetails === "string") {
        payload = { type: "event_reminder", eventId: eventIdOrDetails, userId };
      } else {
        payload = {
          type: "event_reminder",
          eventId: eventIdOrDetails.eventId,
          userId: eventIdOrDetails.userId,
          email: eventIdOrDetails.email,
          name: eventIdOrDetails.name,
          event: eventIdOrDetails.event,
          button: eventIdOrDetails.buttonUrl ? { text: "View Event", url: eventIdOrDetails.buttonUrl } : undefined,
        };
      }

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendReminder error:", err);
      return {
        success: false,
        message: "Failed to dispatch reminder request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers immediate manual event reminder dispatch via backend API (/api/reminders/send).
   */
  async triggerEventReminderNow(
    eventId: string,
    clientRegistrations?: any[],
    clientEvent?: any
  ): Promise<NotificationServiceResponse> {
    try {
      const { auth } = await import("@/lib/firebase");
      const token = await auth.currentUser?.getIdToken();

      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          eventId,
          ...(clientRegistrations ? { registrations: clientRegistrations } : {}),
          ...(clientEvent ? { event: clientEvent } : {})
        }),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] triggerEventReminderNow error:", err);
      return {
        success: false,
        message: "Failed to send manual event reminders.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Attendance Confirmation Notification
   */
  async sendAttendanceConfirmation(
    details: AttendanceConfirmationDetails
  ): Promise<NotificationServiceResponse> {
    try {
      const payload = {
        type: "attendance_confirmation",
        userId: details.userId,
        email: details.email,
        name: details.name,
        event: details.event || (details.eventName ? { title: details.eventName, date: details.eventDate || "TBA" } : undefined),
        button: details.buttonUrl ? { text: "View Attendance", url: details.buttonUrl } : undefined,
      };

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendAttendanceConfirmation error:", err);
      return {
        success: false,
        message: "Failed to dispatch attendance confirmation request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Certificate Issued Notification
   */
  async sendCertificateNotification(
    detailsOrEventId: string | CertificateNotificationDetails,
    userId?: string
  ): Promise<NotificationServiceResponse> {
    try {
      let payload: any;
      if (typeof detailsOrEventId === "string") {
        payload = { type: "certificate", eventId: detailsOrEventId, userId };
      } else {
        payload = {
          type: "certificate",
          userId: detailsOrEventId.userId,
          email: detailsOrEventId.email,
          name: detailsOrEventId.name,
          certificate: detailsOrEventId.certificate || (detailsOrEventId.eventName ? { eventName: detailsOrEventId.eventName, issueDate: detailsOrEventId.issueDate || new Date().toISOString().split("T")[0] } : undefined),
          button: detailsOrEventId.buttonUrl ? { text: "Download Certificate", url: detailsOrEventId.buttonUrl } : undefined,
        };
      }

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendCertificateNotification error:", err);
      return {
        success: false,
        message: "Failed to dispatch certificate notification request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Alias for sendCertificateNotification (Backward Compatibility)
   */
  async sendCertificate(eventId: string, userId: string): Promise<NotificationServiceResponse> {
    return this.sendCertificateNotification(eventId, userId);
  },

  /**
   * Triggers Event Cancellation Notification
   */
  async sendCancellation(
    details: EventCancellationDetails
  ): Promise<NotificationServiceResponse> {
    try {
      const payload = {
        type: "event_cancelled",
        userId: details.userId,
        email: details.email,
        name: details.name,
        event: details.event || (details.eventName ? { title: details.eventName, date: details.eventDate || "TBA", reason: details.reason || "Unforeseen circumstances" } : undefined),
      };

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendCancellation error:", err);
      return {
        success: false,
        message: "Failed to dispatch event cancellation request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Event Rescheduled Notification
   */
  async sendRescheduled(
    details: EventRescheduledDetails
  ): Promise<NotificationServiceResponse> {
    try {
      const payload = {
        type: "event_rescheduled",
        userId: details.userId,
        email: details.email,
        name: details.name,
        event: details.event || (details.eventName ? {
          title: details.eventName,
          oldDate: details.oldDate || "TBA",
          newDate: details.newDate || "TBA",
          oldTime: details.oldTime || "TBA",
          newTime: details.newTime || "TBA",
          venue: details.venue || "Campus",
        } : undefined),
      };

      const res = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendRescheduled error:", err);
      return {
        success: false,
        message: "Failed to dispatch event rescheduled request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Event Cancellation Broadcast to all active registered participants
   */
  async sendEventCancellationEmail(
    eventId: string,
    reason?: string,
    cancelledBy?: string,
    force?: boolean,
    clientRegsOverride?: any[],
    retryFailedOnly?: boolean
  ): Promise<NotificationServiceResponse> {
    try {
      const res = await fetch("/api/notifications/cancellation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          reason,
          cancelledBy,
          force,
          retryFailedOnly,
          registrationsOverride: clientRegsOverride
        }),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendEventCancellationEmail error:", err);
      return {
        success: false,
        message: "Failed to dispatch event cancellation request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Event Reschedule Broadcast to all active registered participants
   */
  async sendEventRescheduledEmail(
    eventId: string,
    newDate: string,
    newTime: string,
    newVenue?: string,
    reason?: string,
    rescheduledBy?: string,
    clientRegsOverride?: any[]
  ): Promise<NotificationServiceResponse> {
    try {
      const res = await fetch("/api/notifications/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          newDate,
          newTime,
          newVenue,
          reason,
          rescheduledBy,
          registrationsOverride: clientRegsOverride
        }),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendEventRescheduledEmail error:", err);
      return {
        success: false,
        message: "Failed to dispatch event reschedule request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Triggers Announcement Notification Broadcast via n8n webhook (Phase 3)
   */
  async sendAnnouncement(
    announcement: {
      id?: string;
      title?: string;
      message?: string;
      category?: string;
      isImportant?: boolean;
      priority?: string;
      date?: string;
      publishedAt?: string;
      url?: string;
    } | string,
    recipients?: { email: string; name: string }[],
    eventId?: string
  ): Promise<NotificationServiceResponse> {
    try {
      const isString = typeof announcement === "string";
      const annObj = isString ? { id: announcement } : announcement;
      const annId = isString ? announcement : announcement.id;

      let recipientList = recipients;
      if (!recipientList || recipientList.length === 0) {
        try {
          const users = await userService.getUsers();
          recipientList = users
            .filter((u) => u.email && u.email.includes("@"))
            .map((u) => ({ email: u.email, name: u.name }));
        } catch (err: any) {
          console.warn("[NotificationService] Client-side recipient fetch notice:", err.message || err);
        }
      }

      const requestBody = {
        announcementId: annId,
        announcement: annObj,
        recipients: recipientList,
        eventId,
      };

      console.log("[Step 2: notificationService.ts] Sending POST request to /api/notifications/announcement with body:", JSON.stringify(requestBody, null, 2));

      const res = await fetch("/api/notifications/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      return await safeFetchJson(res);
    } catch (err: any) {
      console.error("[NotificationService] sendAnnouncement error:", err);
      return {
        success: false,
        message: "Failed to dispatch announcement notification request.",
        error: err.message || "Network error",
      };
    }
  },

  /**
   * Dispatch notification when a new Contact Us message is submitted.
   * Notifies the Super Admin via Notification Dispatcher -> n8n -> Email.
   */
  async sendContactMessageNotification(
    messageItem: any
  ): Promise<NotificationServiceResponse> {
    try {
      const { sendNotification } = await import("@/lib/notificationDispatcher");
      const { NotificationType } = await import("@/types/notificationTypes");

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const dashboardLink = `${origin}/admin`;

      const result = await sendNotification(NotificationType.CONTACT_MESSAGE, {
        fullName: messageItem.fullName,
        name: messageItem.fullName,
        email: messageItem.email,
        userEmail: messageItem.email,
        studentEmail: messageItem.email,
        subject: `New Contact Message Received: ${messageItem.subject || "General Inquiry"}`,
        userId: messageItem.userId || null,
        contactMessage: {
          id: messageItem.id,
          messageId: messageItem.messageId,
          fullName: messageItem.fullName,
          email: messageItem.email,
          subject: messageItem.subject,
          message: messageItem.message,
          status: messageItem.status,
          priority: messageItem.priority,
          createdAt: messageItem.createdAt,
        },
        button: {
          text: "View in Admin Dashboard",
          url: dashboardLink,
        },
        customData: {
          messagePreview: messageItem.message ? messageItem.message.substring(0, 200) : "",
          dashboardLink,
        },
      });

      console.log(`[NotificationService] Contact Message notification dispatched via dispatcher:`, result);

      return {
        success: result.success,
        message: result.message,
        data: result,
      };
    } catch (err: any) {
      console.error("[NotificationService] sendContactMessageNotification error:", err);
      return {
        success: false,
        message: "Failed to send contact message notification.",
        error: err.message || "Unknown error",
      };
    }
  },

  /**
   * Dispatch notification when a payment is submitted.
   */
  async sendPaymentSubmittedNotification(payment: any): Promise<NotificationServiceResponse> {
    try {
      const { sendNotification } = await import("@/lib/notificationDispatcher");
      const { NotificationType } = await import("@/types/notificationTypes");
      const result = await sendNotification(NotificationType.PAYMENT_SUBMITTED, {
        userId: payment.userId,
        email: payment.studentEmail,
        userEmail: payment.studentEmail,
        name: payment.studentName,
        fullName: payment.studentName,
        subject: `Payment Submitted for ${payment.eventTitle || "Tech Club Event"}`,
        eventId: payment.eventId,
        registrationId: payment.registrationId,
        payment: {
          paymentId: payment.paymentId || payment.id,
          amount: payment.amount,
          transactionId: payment.transactionId,
          status: "Pending",
          submittedAt: payment.submittedAt,
        },
      });
      return { success: result.success, message: result.message, data: result };
    } catch (err: any) {
      console.warn("[NotificationService] sendPaymentSubmittedNotification notice:", err);
      return { success: false, message: "Payment notification notice.", error: err.message };
    }
  },

  /**
   * Dispatch notification when payment is approved.
   */
  async sendPaymentApprovedNotification(payment: any): Promise<NotificationServiceResponse> {
    try {
      const { sendNotification } = await import("@/lib/notificationDispatcher");
      const { NotificationType } = await import("@/types/notificationTypes");
      const eventTitle = payment.eventTitle || "Tech Club Event";
      const result = await sendNotification(NotificationType.PAYMENT_APPROVED, {
        userId: payment.userId,
        email: payment.studentEmail,
        userEmail: payment.studentEmail,
        name: payment.studentName,
        fullName: payment.studentName,
        subject: `Payment Approved! Ticket Confirmed for ${eventTitle}`,
        eventId: payment.eventId,
        registrationId: payment.registrationId,
        payment: {
          paymentId: payment.paymentId || payment.id,
          amount: payment.amount,
          transactionId: payment.transactionId,
          status: "Verified",
          remarks: payment.remarks || "Payment approved by Admin.",
        },
        button: {
          text: "View My Event Ticket",
          url: `${typeof window !== "undefined" ? window.location.origin : ""}/profile/events`,
        },
      });
      return { success: result.success, message: result.message, data: result };
    } catch (err: any) {
      console.warn("[NotificationService] sendPaymentApprovedNotification notice:", err);
      return { success: false, message: "Payment approved notification notice.", error: err.message };
    }
  },

  /**
   * Dispatch notification when payment is rejected.
   */
  async sendPaymentRejectedNotification(payment: any): Promise<NotificationServiceResponse> {
    try {
      const { sendNotification } = await import("@/lib/notificationDispatcher");
      const { NotificationType } = await import("@/types/notificationTypes");
      const eventTitle = payment.eventTitle || "Tech Club Event";
      const remarks = payment.remarks || "Invalid transaction UTR or screenshot proof.";
      const result = await sendNotification(NotificationType.PAYMENT_REJECTED, {
        userId: payment.userId,
        email: payment.studentEmail,
        userEmail: payment.studentEmail,
        name: payment.studentName,
        fullName: payment.studentName,
        subject: `Payment Rejected for ${eventTitle}`,
        reason: remarks,
        eventId: payment.eventId,
        registrationId: payment.registrationId,
        payment: {
          paymentId: payment.paymentId || payment.id,
          amount: payment.amount,
          transactionId: payment.transactionId,
          status: "Rejected",
          remarks: remarks,
        },
        button: {
          text: "Upload New Proof",
          url: `${typeof window !== "undefined" ? window.location.origin : ""}/profile/events`,
        },
      });
      return { success: result.success, message: result.message, data: result };
    } catch (err: any) {
      console.warn("[NotificationService] sendPaymentRejectedNotification notice:", err);
      return { success: false, message: "Payment rejected notification notice.", error: err.message };
    }
  },
};
