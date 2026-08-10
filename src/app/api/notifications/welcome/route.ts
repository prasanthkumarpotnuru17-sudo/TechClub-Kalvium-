import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { sendNotification } from "@/lib/notificationDispatcher";
import { NotificationType } from "@/types/notificationTypes";

export async function POST(req: Request) {
  const nowTimestamp = new Date().toISOString();

  try {
    const body = await req.json();
    const { userId, userEmail, fullName, force } = body;

    console.log(`[Welcome Notification API] Route entered. Payload received:`, JSON.stringify(body));

    if (!userId || !userEmail) {
      console.warn(`[Welcome Notification API] Bad request: missing userId or userEmail.`);
      return NextResponse.json({
        success: false,
        message: "Missing required fields: userId and userEmail are required."
      }, { status: 400 });
    }

    const displayName = fullName || userEmail.split("@")[0] || "Member";

    // 1. Check if welcome email was already sent (unless force is requested)
    let shouldProceed = true;
    let existingAttempts = 0;
    let skipReason = "";

    if (!force) {
      if (adminDb) {
        try {
          const userDoc = await adminDb.collection("users").doc(userId).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            if (data?.welcomeEmailSent === true) {
              shouldProceed = false;
              skipReason = "Welcome email already sent.";
            } else if (data?.welcomeNotificationStatus === "sending") {
              shouldProceed = false;
              skipReason = "Welcome email notification dispatch is currently in progress.";
            }
            existingAttempts = data?.welcomeNotificationAttempts || 0;
          }
        } catch (lockErr) {
          console.warn("[Welcome Notification API] Lock check warning:", lockErr);
        }
      }
    }

    if (!shouldProceed) {
      console.log(`[Welcome Notification API] Dispatch skipped: ${skipReason}`);
      return NextResponse.json({
        success: true,
        message: skipReason,
        skipped: true
      });
    }

    // Mark status as sending in Firestore
    if (adminDb) {
      try {
        await adminDb.collection("users").doc(userId).set({
          welcomeNotificationStatus: "sending",
          welcomeNotificationAttempts: existingAttempts + 1,
          welcomeNotificationLastAttemptAt: nowTimestamp,
          updatedAt: nowTimestamp
        }, { merge: true });
      } catch (updErr) {
        console.warn("[Welcome Notification API] Warning updating sending status:", updErr);
      }
    }

    // 2. Dispatch via Centralized Notification Dispatcher
    const dispatchResult = await sendNotification(NotificationType.WELCOME, {
      userId,
      email: userEmail,
      userEmail,
      name: displayName,
      fullName: displayName,
    });

    if (dispatchResult.success) {
      if (adminDb) {
        try {
          await adminDb.collection("users").doc(userId).set({
            welcomeEmailSent: true,
            welcomeEmailSentAt: nowTimestamp,
            welcomeNotificationStatus: "sent",
            updatedAt: nowTimestamp
          }, { merge: true });
        } catch (uErr) {
          console.warn("[Welcome Notification API] Warning marking welcomeEmailSent:", uErr);
        }
      }
      return NextResponse.json({
        success: true,
        message: "Welcome email notification successfully dispatched to n8n.",
        data: dispatchResult
      });
    } else {
      if (adminDb) {
        try {
          await adminDb.collection("users").doc(userId).set({
            welcomeNotificationStatus: "failed",
            updatedAt: nowTimestamp
          }, { merge: true });
        } catch (uErr) {
          console.warn("[Welcome Notification API] Warning marking failed status:", uErr);
        }
      }
      return NextResponse.json({
        success: false,
        message: dispatchResult.message,
        error: dispatchResult.error
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error("[Welcome Notification API] Exception in route handler:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error dispatching welcome notification.",
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
}
