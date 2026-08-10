/**
 * Calendar & Reminder Utility Helper
 * Provides 1-click Google Calendar URL generation, Apple/Outlook .ics file downloads,
 * and WhatsApp reminder message formatting.
 */

export interface CalendarEventDetails {
  title: string;
  description?: string;
  location?: string;
  date?: string; // e.g. "2026-08-15" or ISO string
  time?: string; // e.g. "10:00 AM"
  durationHours?: number;
}

/**
 * Format Date & Time strings into standard ISO Date objects
 */
function parseEventDates(dateStr?: string, timeStr?: string, durationHours: number = 2) {
  let startDate = new Date();
  
  if (dateStr) {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      startDate = parsed;
    }
  }

  // Parse time string (e.g. "10:00 AM" or "14:30")
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
        if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
      }
      startDate.setHours(hours, minutes, 0, 0);
    }
  }

  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Format Date to ISO string format required by Google Calendar (YYYYMMDDTHHmmssZ)
 */
function formatUtcCompact(d: Date): string {
  return d.toISOString().replace(/-|:|\.\d+/g, "");
}

/**
 * Generate 1-Click Google Calendar Add Event Link
 */
export function getGoogleCalendarUrl(event: CalendarEventDetails): string {
  const { startDate, endDate } = parseEventDates(event.date, event.time, event.durationHours || 2);
  
  const datesParam = `${formatUtcCompact(startDate)}/${formatUtcCompact(endDate)}`;
  const titleParam = encodeURIComponent(event.title);
  const detailsParam = encodeURIComponent(
    `${event.description || "Tech Club Event"} \n\n📍 Location: ${event.location || "Kalvium Campus"}\n🎟️ Access your pass on the Tech Club Portal.`
  );
  const locationParam = encodeURIComponent(event.location || "Kalvium Campus");

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${titleParam}&dates=${datesParam}&details=${detailsParam}&location=${locationParam}`;
}

/**
 * Generate and trigger download for Apple / Outlook / Universal .ics File
 */
export function downloadIcsFile(event: CalendarEventDetails) {
  const { startDate, endDate } = parseEventDates(event.date, event.time, event.durationHours || 2);

  const startFormatted = formatUtcCompact(startDate);
  const endFormatted = formatUtcCompact(endDate);
  const nowFormatted = formatUtcCompact(new Date());

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kalvium Tech Club//Event Pass//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:evt-${Date.now()}@kalvium.tech`,
    `DTSTAMP:${nowFormatted}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || "Tech Club Event").replace(/\n/g, "\\n")}`,
    `LOCATION:${event.location || "Kalvium Campus"}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = window.URL.createObjectURL(blob);
  const safeFilename = (event.title || "event").toLowerCase().replace(/[^a-z0-9]/g, "_");
  link.setAttribute("download", `${safeFilename}_event.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate WhatsApp Reminder Link & Pre-filled Text Payload
 */
export function getWhatsAppReminderUrl(event: CalendarEventDetails, recipientPhone?: string, passUrl?: string): string {
  const phone = (recipientPhone || "").replace(/[^0-9]/g, "");
  const text = `🚨 *EVENT REMINDER: ${event.title}* 🚨\n\n📅 *Date:* ${event.date || "Upcoming"}\n⏰ *Time:* ${event.time || "TBA"}\n📍 *Location:* ${event.location || "Kalvium Campus"}\n\n🎟️ View your Event Pass QR Code here:\n${passUrl || window.location.origin + "/profile/events"}\n\nSee you there! 🚀`;

  const encodedText = encodeURIComponent(text);
  return phone ? `https://wa.me/${phone}?text=${encodedText}` : `https://api.whatsapp.com/send?text=${encodedText}`;
}
