import { NextResponse } from "next/server";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";
import { ApiResponse } from "@/types/apiResponse";

export interface DispatchNotificationRequest {
  type?: string;
  notificationType?: string;
  userId?: string;
  email?: string;
  userEmail?: string;
  name?: string;
  fullName?: string;
  subject?: string;
  registrationId?: string;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  eventTime?: string;
  eventVenue?: string;
  reason?: string;
  oldDate?: string;
  newDate?: string;
  oldTime?: string;
  newTime?: string;
  venue?: string;
  event?: {
    id?: string;
    title?: string;
    date?: string;
    time?: string;
    venue?: string;
    reason?: string;
    oldDate?: string;
    newDate?: string;
    oldTime?: string;
    newTime?: string;
  };
  certificate?: {
    eventName?: string;
    issueDate?: string;
    certificateNumber?: string;
    verificationCode?: string;
    pdfBase64?: string;
    fileName?: string;
  };
  contactMessage?: {
    messageId?: string;
    fullName?: string;
    email?: string;
    subject?: string;
    message?: string;
    createdAt?: string;
  };
  button?: {
    text?: string;
    url?: string;
  };
  recipients?: Array<{ email: string; name: string }>;
}

export async function POST(req: Request) {
  try {
    const body: DispatchNotificationRequest = await req.json();
    const rawType = (body.notificationType || body.type || "").toUpperCase().trim();

    if (!rawType) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: "MISSING_NOTIFICATION_TYPE",
        data: null,
        error: "type or notificationType is required in request payload."
      }, { status: 400 });
    }

    // Resolve NotificationType enum
    let enumType: NotificationType = NotificationType.REMINDER;

    if (rawType.includes("WELCOME")) {
      enumType = NotificationType.WELCOME;
    } else if (rawType.includes("REGISTRATION")) {
      enumType = NotificationType.EVENT_REGISTRATION;
    } else if (rawType.includes("ATTENDANCE") || rawType.includes("CHECKIN")) {
      enumType = NotificationType.ATTENDANCE;
    } else if (rawType.includes("CERTIFICATE")) {
      enumType = NotificationType.CERTIFICATE;
    } else if (rawType.includes("ANNOUNCEMENT")) {
      enumType = NotificationType.ANNOUNCEMENT;
    } else if (rawType.includes("CANCEL")) {
      enumType = NotificationType.CANCELLATION;
    } else if (rawType.includes("RESCHEDULE")) {
      enumType = NotificationType.RESCHEDULED;
    } else if (rawType.includes("CONTACT")) {
      enumType = NotificationType.CONTACT_MESSAGE;
    } else if (rawType.includes("REMINDER")) {
      enumType = NotificationType.REMINDER;
    }

    const recipientEmail = body.email || body.userEmail || "";
    const recipientName = body.name || body.fullName || "Member";

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tech-club-platform.firebaseapp.com");

    const eventData = body.event || {
      id: body.eventId || "",
      title: body.eventName || "Tech Club Event",
      date: body.eventDate || "TBA",
      time: body.eventTime || "TBA",
      venue: body.eventVenue || "Campus",
      reason: body.reason,
      oldDate: body.oldDate,
      newDate: body.newDate,
      oldTime: body.oldTime,
      newTime: body.newTime,
    };

    const dispatchResult = await sendNotification(enumType, {
      userId: body.userId,
      email: recipientEmail,
      userEmail: recipientEmail,
      name: recipientName,
      fullName: recipientName,
      subject: body.subject,
      registrationId: body.registrationId,
      eventId: body.eventId || eventData.id,
      event: eventData,
      certificate: body.certificate,
      contactMessage: body.contactMessage,
      recipients: body.recipients,
      button: body.button || {
        text: "View Details",
        url: `${baseUrl}/#events`
      }
    });

    return NextResponse.json<ApiResponse>({
      success: dispatchResult.success,
      message: dispatchResult.message,
      data: {
        correlationId: dispatchResult.correlationId,
        notificationType: enumType,
        webhookUrl: dispatchResult.webhookUrl,
        attempts: dispatchResult.attempts,
        httpStatus: dispatchResult.httpStatus || null
      },
      error: dispatchResult.error || null
    }, { status: 200 }); // Always 200 so clients handle dispatch result status gracefully

  } catch (error: any) {
    console.warn("[Notification Dispatch Route] Handled exception:", error?.message || error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: "Internal Notification Dispatch Error",
      data: null,
      error: error?.message || String(error)
    }, { status: 200 });
  }
}
