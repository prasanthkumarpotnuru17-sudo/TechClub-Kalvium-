import { CanonicalRegistrationDoc } from "../types/registrationTypes";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";

export const registrationNotifications = {
  /**
   * Post-commit event registration email dispatch wrapper
   */
  async sendConfirmationEmail(reg: CanonicalRegistrationDoc): Promise<void> {
    if (!reg.email) return;
    try {
      const r = reg as any;
      const eventTitle = r.eventName || r.eventTitle || r.title || "Tech Club Event";
      const eventDate = r.eventDate || r.date || r.event_date || "Upcoming";
      const eventTime = r.eventTime || r.time || r.event_time || "Scheduled Time";
      const venue = r.venue || r.location || r.mode || "Campus Auditorium";

      await sendNotification(NotificationType.EVENT_REGISTRATION, {
        email: reg.email,
        userEmail: reg.email,
        name: reg.studentName || reg.name,
        studentName: reg.studentName || reg.name,
        studentEmail: reg.email,
        subject: `Event Registration Confirmation - ${eventTitle}`,
        eventTitle: eventTitle,
        eventDate: eventDate,
        eventTime: eventTime,
        venue: venue,
        eventId: reg.eventId,
        registrationId: reg.id,
        event: {
          id: reg.eventId,
          title: eventTitle,
          date: eventDate,
          time: eventTime,
          venue: venue,
        },
      });
      console.log(`[Registration Notifications] Confirmation email dispatched for registration ${reg.id}`);
    } catch (err) {
      console.warn(`[Registration Notifications] Email dispatch notice for ${reg.id}:`, err);
    }
  },
};
