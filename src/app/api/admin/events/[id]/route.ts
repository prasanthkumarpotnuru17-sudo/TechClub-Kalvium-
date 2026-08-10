import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { ApiResponse } from "@/types/apiResponse";

async function verifySuperAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  
  try {
    const token = authHeader.split("Bearer ")[1];
    // In a real implementation, you verify the token with adminAuth.verifyIdToken(token)
    // Then get email and check the `team_access` collection for role === 'super_admin'
    // For now, we assume the middleware or token check returns the UID
    return "admin-uid-placeholder"; 
  } catch (e) {
    return null;
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const db = adminDb;
    if (!db) {
      return NextResponse.json<ApiResponse>({
        success: false,
        message: "ADMIN_SDK_NOT_CONFIGURED",
        data: null,
        error: "Firebase Admin credentials not configured in environment variables."
      }, { status: 503 });
    }

    const uid = await verifySuperAdmin(req);
    if (!uid) {
      return NextResponse.json<ApiResponse>({ success: false, message: "Unauthorized", data: null, error: "Missing super_admin privileges" }, { status: 401 });
    }

    const { id: eventId } = await params;
    const batch = db.batch();

    // 1. Delete Event Document
    const eventRef = db.collection("events").doc(eventId);
    batch.delete(eventRef);

    // 2. Delete Registrations
    const regsSnap = await db.collection("registrations").where("eventId", "==", eventId).get();
    regsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 3. Delete Certificates
    const certsSnap = await db.collection("certificates").where("eventId", "==", eventId).get();
    certsSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    // 4. Delete Notifications
    const notifSnap = await db.collection("notifications").where("targetId", "==", eventId).get();
    notifSnap.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Execute Batch
    await batch.commit();

    // 5. Cleanup Storage (Best effort, non-blocking)
    try {
      if (adminStorage) {
        const bucket = adminStorage.bucket();
        await bucket.deleteFiles({ prefix: `events/${eventId}/` });
      }
    } catch (storageErr) {
      console.warn("Storage cleanup failed:", storageErr);
    }

    // 6. Log Activity
    await db.collection("activity_logs").add({
      action: "DELETE_EVENT",
      performedBy: uid,
      targetType: "event",
      targetId: eventId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Event and all associated data deleted successfully.",
      data: null,
      error: null
    });
  } catch (error: any) {
    console.error("Cascade Delete Error:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: "Failed to cascade delete event.",
      data: null,
      error: error.message
    }, { status: 500 });
  }
}
