import { NextResponse } from "next/server";
import {
  resolveRegistrationContext,
  acquireRegistrationNotificationLock,
  updateRegistrationNotificationState
} from "@/lib/eventNotificationUtils";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";
import {
  EventRegistrationNotificationRequest,
  EventRegistrationNotificationResponse
} from "@/types/eventNotification";

export async function POST(req: Request) {
  try {
    const body: EventRegistrationNotificationRequest & { force?: boolean } = await req.json();
    const { registrationId, eventId, userId, userEmail, fullName, eventName, eventDate, eventTime, eventVenue, force } = body;

    console.log(`[Event Registration Notification API] Received request for registrationId:`, registrationId);

    // 1. Validate request body
    if (!registrationId) {
      console.warn(`[Event Registration Notification API] Bad request: missing registrationId.`);
      return NextResponse.json<EventRegistrationNotificationResponse>({
        success: false,
        message: "Missing required field: registrationId is required in request body.",
        error: "MISSING_REGISTRATION_ID"
      }, { status: 400 });
    }

    // 2. Fetch authoritative data from Firestore (with fallback details)
    const context = await resolveRegistrationContext(registrationId, eventId, userId, {
      userEmail,
      fullName,
      eventName,
      eventDate,
      eventTime,
      eventVenue
    });
    if (!context) {
      console.warn(`[Event Registration Notification API] Registration context not found in Firestore for ID: ${registrationId}`);
      return NextResponse.json<EventRegistrationNotificationResponse>({
        success: false,
        message: `Registration record not found for ID: ${registrationId}`,
        error: "REGISTRATION_NOT_FOUND"
      }, { status: 404 });
    }

    // 3. Enforce Duplicate Check & Lock State in Firestore (unless force is requested)
    if (!force) {
      const lockResult = await acquireRegistrationNotificationLock(registrationId, context);
      if (!lockResult.shouldProceed) {
        console.log(`[Event Registration Notification API] Skipped for registration ${registrationId}: ${lockResult.skipReason}`);
        return NextResponse.json<EventRegistrationNotificationResponse>({
          success: true,
          message: lockResult.skipReason || "Event registration email already sent or dispatch in progress.",
          skipped: true,
          data: {
            registrationId,
            eventId: context.eventId,
            recipientEmail: context.userEmail,
            recipientName: context.fullName,
            status: context.currentNotificationState.status,
            sentAt: context.currentNotificationState.sentAt
          }
        });
      }
    }

    // 4. Construct CTA link & dispatch via Centralized Notification Dispatcher
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tech-club-platform.firebaseapp.com");
    
    const buttonLink = `${baseUrl}/events/${context.eventId}`;

    const dispatchResult = await sendNotification(NotificationType.EVENT_REGISTRATION, {
      userId: context.userId || context.registrationId,
      email: context.userEmail,
      userEmail: context.userEmail,
      name: context.fullName,
      fullName: context.fullName,
      eventId: context.eventId,
      registrationId: context.registrationNumber || registrationId,
      event: {
        id: context.eventId,
        title: context.eventName,
        date: context.eventDate,
        time: context.eventTime,
        venue: context.eventVenue,
      },
      button: {
        text: "View Event Details",
        url: buttonLink
      }
    });

    if (dispatchResult.success) {
      await updateRegistrationNotificationState(registrationId, {
        status: "sent",
        sentAt: new Date().toISOString()
      });

      return NextResponse.json<EventRegistrationNotificationResponse>({
        success: true,
        message: "Event registration confirmation notification sent to n8n.",
        data: {
          registrationId,
          eventId: context.eventId,
          recipientEmail: context.userEmail,
          recipientName: context.fullName,
          status: "sent",
          sentAt: new Date().toISOString()
        }
      });
    } else {
      await updateRegistrationNotificationState(registrationId, {
        status: "failed",
        error: dispatchResult.error || "Failed to reach n8n webhook"
      });

      return NextResponse.json<EventRegistrationNotificationResponse>({
        success: false,
        message: dispatchResult.message,
        error: dispatchResult.error || "DISPATCH_FAILED"
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error("[Event Registration Notification API] Exception in route handler:", error);
    return NextResponse.json<EventRegistrationNotificationResponse>({
      success: false,
      message: "Internal server error dispatching registration notification.",
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
}
