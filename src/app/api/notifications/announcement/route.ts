import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";
import {
  AnnouncementNotificationRequest,
  AnnouncementNotificationResponse
} from "@/types/announcementNotification";

interface UserRecipient {
  email: string;
  name: string;
}

export async function POST(req: Request) {
  const nowIso = new Date().toISOString();

  try {
    const body: AnnouncementNotificationRequest = await req.json();
    const { announcementId, announcement } = body;

    console.log("[Step 3: API Route] Announcement route entered. Body:", JSON.stringify(body, null, 2));

    const COLLECTION_NAME = "announcements";
    let fetchedDocData: any = null;
    let docExists = false;

    if (announcementId) {
      const cleanId = announcementId.trim();
      try {
        if (adminDb) {
          const annDoc = await adminDb.collection(COLLECTION_NAME).doc(cleanId).get();
          docExists = annDoc.exists;
          if (docExists) fetchedDocData = annDoc.data();
        } else {
          const annRef = doc(db, COLLECTION_NAME, cleanId);
          const annSnap = await getDoc(annRef);
          docExists = annSnap.exists();
          if (docExists) fetchedDocData = annSnap.data();
        }
      } catch (err: any) {
        console.error(`[Announcement API] Error querying Firestore for ID "${cleanId}":`, err.message || err);
      }
    }

    const annTitle = (fetchedDocData?.title || announcement?.title || "").trim();
    const annMessage = (fetchedDocData?.message || announcement?.message || "").trim();
    const annCategory = (fetchedDocData?.category || announcement?.category || "General").trim();
    const annPriority = (fetchedDocData?.priority || (fetchedDocData?.isImportant || announcement?.isImportant ? "High" : "Normal")).trim();
    const annPublishedAt = (fetchedDocData?.publishedAt || fetchedDocData?.createdAt || fetchedDocData?.date || announcement?.publishedAt || announcement?.date || nowIso).trim();

    if (!annTitle || !annMessage) {
      console.warn("[Announcement API] Missing required title or message for announcement notification.");
      return NextResponse.json<AnnouncementNotificationResponse>({
        success: false,
        message: "Missing required fields: title and message are required for announcement notifications.",
        error: "MISSING_ANNOUNCEMENT_FIELDS"
      }, { status: 400 });
    }

    // Resolve recipients
    const recipientsMap = new Map<string, UserRecipient>();
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      body.recipients.forEach((r: any) => {
        if (r.email && r.email.includes("@")) {
          recipientsMap.set(r.email.toLowerCase().trim(), {
            email: r.email.trim(),
            name: r.fullName || r.name || r.displayName || "Member"
          });
        }
      });
    }

    const recipients = Array.from(recipientsMap.values());

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tech-club-platform.firebaseapp.com");
    const annUrl = announcement?.url || `${baseUrl}/#announcements`;

    // Dispatch via Centralized Notification Dispatcher
    const dispatchResult = await sendNotification(NotificationType.ANNOUNCEMENT, {
      recipients: recipients.map((r) => ({ email: r.email, name: r.name })),
      announcement: {
        title: annTitle,
        message: annMessage,
        category: annCategory,
        priority: annPriority,
        publishedAt: annPublishedAt
      },
      button: {
        text: "View Announcement",
        url: annUrl
      }
    });

    return NextResponse.json<AnnouncementNotificationResponse>({
      success: dispatchResult.success,
      message: dispatchResult.success
        ? `Announcement broadcast sent to n8n for ${recipients.length} recipients.`
        : `Failed to send announcement broadcast to n8n.`,
      data: {
        totalRecipients: recipients.length,
        successful: dispatchResult.success ? recipients.length : 0,
        failed: dispatchResult.success ? 0 : recipients.length
      }
    });

  } catch (error: any) {
    console.error("[Announcement Notification API] Exception in route handler:", error);
    return NextResponse.json<AnnouncementNotificationResponse>({
      success: false,
      message: "Internal server error dispatching announcement notifications.",
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
}
