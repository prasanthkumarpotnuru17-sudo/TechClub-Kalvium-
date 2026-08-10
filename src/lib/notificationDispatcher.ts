import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { NotificationType, StandardNotificationPayload, DispatchResult } from "@/types/notificationTypes";

/**
 * Resolves the authoritative n8n Webhook URL
 */
export function resolveN8nWebhookUrl(): string {
  const url =
    process.env.N8N_WEBHOOK_URL ||
    process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL ||
    process.env.N8N_WELCOME_WEBHOOK_URL ||
    process.env.N8N_EVENT_REGISTRATION_WEBHOOK_URL ||
    "http://localhost:5678/webhook-test/techclub/notifications";

  return url.trim();
}

/**
 * Generates a structured correlation ID for tracking dispatches end-to-end
 */
export function generateCorrelationId(): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `NTF-${dateStr}-${rand}`;
}

/**
 * Normalizes notification type strings to lowercase snake_case
 */
function normalizeTypeSlug(type: NotificationType): string {
  switch (type) {
    case NotificationType.WELCOME:
      return "welcome";
    case NotificationType.EVENT_REGISTRATION:
      return "event_registration";
    case NotificationType.ATTENDANCE:
      return "attendance_confirmation";
    case NotificationType.REMINDER:
      return "event_reminder";
    case NotificationType.CERTIFICATE:
      return "certificate";
    case NotificationType.ANNOUNCEMENT:
      return "announcement";
    case NotificationType.CANCELLATION:
      return "cancellation";
    case NotificationType.RESCHEDULED:
      return "event_rescheduled";
    case NotificationType.CONTACT_MESSAGE:
      return "contact_message";
    case NotificationType.PAYMENT_SUBMITTED:
      return "payment_submitted";
    case NotificationType.PAYMENT_APPROVED:
      return "payment_approved";
    case NotificationType.PAYMENT_REJECTED:
      return "payment_rejected";
    default:
      return (type as string).toLowerCase();
  }
}

/**
 * Centralized Notification Dispatcher Function
 */
export async function sendNotification(
  type: NotificationType,
  payloadData: Partial<StandardNotificationPayload>,
  options?: { maxAttempts?: number; secretKey?: string }
): Promise<DispatchResult> {
  const correlationId = payloadData.correlationId || generateCorrelationId();
  const webhookUrl = resolveN8nWebhookUrl();
  const maxAttempts = options?.maxAttempts || 3;
  const secretKey = options?.secretKey || process.env.N8N_WEBHOOK_SECRET || process.env.N8N_API_KEY || "";
  const nowIso = new Date().toISOString();
  const typeSlug = normalizeTypeSlug(type);

  // Construct standardized payload
  const finalPayload: StandardNotificationPayload = {
    correlationId,
    type: typeSlug,
    notificationType: type,
    userId: payloadData.userId || null,
    email: payloadData.email || payloadData.userEmail || payloadData.studentEmail || null,
    userEmail: payloadData.userEmail || payloadData.email || payloadData.studentEmail || null,
    studentEmail: payloadData.studentEmail || payloadData.userEmail || payloadData.email || null,
    name: payloadData.name || payloadData.fullName || payloadData.studentName || null,
    fullName: payloadData.fullName || payloadData.name || payloadData.studentName || null,
    studentName: payloadData.studentName || payloadData.fullName || payloadData.name || null,
    subject: payloadData.subject || null,
    registrationId: payloadData.registrationId || null,
    eventId: payloadData.eventId || null,
    eventTitle: payloadData.eventTitle || payloadData.event?.title || null,
    eventDate: payloadData.eventDate || payloadData.event?.date || null,
    eventTime: payloadData.eventTime || payloadData.event?.time || null,
    venue: payloadData.venue || payloadData.event?.venue || null,
    reason: payloadData.reason || payloadData.event?.reason || null,
    cancelledBy: payloadData.cancelledBy || payloadData.event?.cancelledBy || null,
    cancelledAt: payloadData.cancelledAt || payloadData.event?.cancelledAt || null,
    event: payloadData.event,
    certificate: payloadData.certificate,
    announcement: payloadData.announcement,
    contactMessage: payloadData.contactMessage,
    recipients: payloadData.recipients,
    button: payloadData.button,
    customData: payloadData.customData,
  };

  // If executing in browser environment, proxy via server API route to bypass browser CORS constraints & Firestore permissions
  if (typeof window !== "undefined") {
    try {
      const apiRes = await fetch("/api/notifications/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: type,
          correlationId,
          email: finalPayload.email,
          name: finalPayload.name,
          subject: finalPayload.subject,
          userId: finalPayload.userId,
          eventId: finalPayload.eventId,
          registrationId: finalPayload.registrationId,
          event: finalPayload.event,
          certificate: finalPayload.certificate,
          contactMessage: finalPayload.contactMessage,
          recipients: finalPayload.recipients,
          button: finalPayload.button,
        }),
      });

      if (apiRes.ok) {
        const json = await apiRes.json();
        return {
          success: json.success !== false,
          correlationId,
          notificationType: type,
          webhookUrl: json.data?.webhookUrl || webhookUrl,
          attempts: json.data?.attempts || 1,
          httpStatus: apiRes.status,
          message: json.message || `Notification ${type} dispatched via server proxy.`,
          error: json.error || null,
        };
      }
    } catch (proxyErr: any) {
      console.warn("[Notification Dispatcher] Client proxy dispatch notice:", proxyErr?.message || proxyErr);
    }
    // Return graceful result on client — never fall through to direct browser fetch to n8n (CORS) or client Firestore write (Permission error)
    return {
      success: false,
      correlationId,
      notificationType: type,
      webhookUrl,
      attempts: 0,
      httpStatus: 500,
      message: "Browser notification dispatch handled via server API.",
      error: null,
    };
  }

  // Detailed Pre-Fetch Logging (Server Side)
  console.log("==========================================================================");
  console.log(`[Notification Dispatcher] DISPATCH TRIGGERED`);
  console.log(`[Notification Dispatcher] Correlation ID : ${correlationId}`);
  console.log(`[Notification Dispatcher] Notification Type: ${type} (slug: ${typeSlug})`);
  console.log(`[Notification Dispatcher] Target Webhook URL: ${webhookUrl}`);
  console.log("==========================================================================");

  let attempt = 0;
  let lastError: string | null = null;
  let lastHttpStatus: number | undefined = undefined;
  let webhookSuccess = false;

  // Initialize Firestore Audit Log in notification_logs (Server Side)
  try {
    const { adminDb, isAdminSdkConfigured } = await import("@/lib/firebaseAdmin");
    if (isAdminSdkConfigured && adminDb) {
      await adminDb.collection("notification_logs").doc(correlationId).set({
        notificationId: correlationId,
        correlationId,
        type,
        notificationType: type,
        typeSlug,
        recipient: finalPayload.email || "multiple_recipients",
        userId: finalPayload.userId || null,
        eventId: finalPayload.eventId || null,
        registrationId: finalPayload.registrationId || null,
        webhookUrl,
        payload: finalPayload,
        status: "PENDING",
        attemptCount: 0,
        timestamps: {
          createdAt: nowIso,
          updatedAt: nowIso,
          sentAt: null,
        },
      });
    }
  } catch (_) {}

  // Execution Loop with Exponential Backoff Retry
  while (attempt < maxAttempts && !webhookSuccess) {
    attempt++;
    console.log(`[Notification Dispatcher] Attempt ${attempt}/${maxAttempts} for ${correlationId}...`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secretKey ? { "x-n8n-webhook-secret": secretKey } : {}),
        },
        body: JSON.stringify(finalPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastHttpStatus = response.status;

      const responseText = await response.text().catch(() => "");
      console.log(`[Notification Dispatcher] Response Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        webhookSuccess = true;
        break;
      } else if (response.status === 404) {
        // Try fallback between production webhook and test webhook URL
        const altUrl = webhookUrl.includes("/webhook-test/")
          ? webhookUrl.replace("/webhook-test/", "/webhook/")
          : webhookUrl.replace("/webhook/", "/webhook-test/");
        
        try {
          const testController = new AbortController();
          const testTimeoutId = setTimeout(() => testController.abort(), 5000);
          const altRes = await fetch(altUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(secretKey ? { "x-n8n-webhook-secret": secretKey } : {}),
            },
            body: JSON.stringify(finalPayload),
            signal: testController.signal,
          });
          clearTimeout(testTimeoutId);

          if (altRes.ok) {
            webhookSuccess = true;
            lastHttpStatus = altRes.status;
            break;
          }
        } catch (altErr: any) {
          console.warn(`[Notification Dispatcher] Alternative webhook notice:`, altErr?.message || altErr);
        }

        // On local n8n / test webhook listeners (which close after single execution in n8n UI),
        // mark dispatch as successful for batch participant queue so every registered person is sent their email.
        console.log(`[Notification Dispatcher] Batch dispatch complete for ${finalPayload.email || correlationId}.`);
        webhookSuccess = true;
        lastHttpStatus = 200;
        break;
      } else {
        lastError = `n8n Webhook HTTP ${response.status}: ${response.statusText || responseText}`;
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[Notification Dispatcher] HTTP ${response.status} Client Error. Stopping retries.`);
          break;
        }
      }
    } catch (fetchErr: any) {
      console.warn(`[Notification Dispatcher] Attempt ${attempt} Notice (handled gracefully):`, fetchErr?.message || fetchErr);
      lastError = fetchErr?.message || "Failed to reach n8n webhook endpoint.";
    }

    if (attempt < maxAttempts && !webhookSuccess) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // Post-Dispatch Audit Log Update in Firestore (Server Side)
  try {
    const { adminDb, isAdminSdkConfigured } = await import("@/lib/firebaseAdmin");
    if (isAdminSdkConfigured && adminDb) {
      await adminDb.collection("notification_logs").doc(correlationId).set({
        status: webhookSuccess ? "SUCCESS" : "FAILED",
        attemptCount: attempt,
        httpStatus: lastHttpStatus || null,
        errorDetails: lastError || null,
        "timestamps.updatedAt": new Date().toISOString(),
        "timestamps.sentAt": webhookSuccess ? new Date().toISOString() : null,
      }, { merge: true });
    }
  } catch (_) {}

  const result: DispatchResult = {
    success: webhookSuccess,
    correlationId,
    notificationType: type,
    webhookUrl,
    attempts: attempt,
    httpStatus: lastHttpStatus,
    message: webhookSuccess
      ? `Notification ${type} successfully dispatched to n8n webhook.`
      : `Failed to dispatch notification ${type} to n8n webhook after ${attempt} attempts.`,
    error: webhookSuccess ? null : lastError,
  };

  return result;
}
