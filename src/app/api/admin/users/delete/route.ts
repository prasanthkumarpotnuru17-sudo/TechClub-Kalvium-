import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing authorization header." },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Empty token." }, { status: 401 });
    }

    if (!isAdminSdkConfigured || !adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server Configuration Error: Firebase Admin SDK unavailable." },
        { status: 500 }
      );
    }

    // 1. Verify Requester Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.error("[Admin User Delete API] Token verification failed:", err);
      return NextResponse.json({ error: "Unauthorized: Invalid or expired token." }, { status: 401 });
    }

    const requesterUid = decodedToken.uid;
    const requesterEmail = (decodedToken.email || "").toLowerCase().trim();

    // 2. Verify Requester Role (Must be SUPER_ADMIN ONLY)
    let isAuthorized = false;
    if (requesterEmail) {
      const teamSnap = await adminDb.collection("team_access").doc(requesterEmail).get();
      if (teamSnap.exists) {
        const role = teamSnap.data()?.role;
        if (role === "super_admin") {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      // Fallback check user doc role
      const requesterDoc = await adminDb.collection("users").doc(requesterUid).get();
      if (requesterDoc.exists && requesterDoc.data()?.role === "super_admin") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden: Super Admin privileges required to delete users." }, { status: 403 });
    }

    // 3. Parse Target User Parameters
    const body = await req.json();
    const targetUserId = body.targetUserId || body.userId || body.id;
    const targetEmail = (body.targetEmail || body.email || "").toLowerCase().trim();

    if (!targetUserId) {
      return NextResponse.json({ error: "Bad Request: Missing targetUserId parameter." }, { status: 400 });
    }

    if (targetUserId === requesterUid) {
      return NextResponse.json({ error: "Forbidden: You cannot delete your own account from Admin Dashboard." }, { status: 400 });
    }

    // Protect sole Super Admin
    if (targetEmail) {
      const targetTeamSnap = await adminDb.collection("team_access").doc(targetEmail).get();
      if (targetTeamSnap.exists && targetTeamSnap.data()?.role === "super_admin") {
        const superAdminsSnap = await adminDb.collection("team_access").where("role", "==", "super_admin").get();
        if (superAdminsSnap.size <= 1) {
          return NextResponse.json(
            { error: "Cannot delete user: Target user is the sole Super Admin." },
            { status: 403 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 4. Atomic Firestore Cleanup
    const batch = adminDb.batch();

    // Delete users/{targetUserId}
    const userRef = adminDb.collection("users").doc(targetUserId);
    batch.delete(userRef);

    // Delete profiles/{targetUserId}
    const profileRef = adminDb.collection("profiles").doc(targetUserId);
    batch.delete(profileRef);

    // Delete admin_uids/{targetUserId} if exists
    const adminUidRef = adminDb.collection("admin_uids").doc(targetUserId);
    batch.delete(adminUidRef);

    // Delete team_access/{targetEmail} if provided
    if (targetEmail) {
      const teamAccessRef = adminDb.collection("team_access").doc(targetEmail);
      batch.delete(teamAccessRef);
    }

    // Anonymize user registrations
    try {
      const regsSnap = await adminDb.collection("registrations").where("userId", "==", targetUserId).get();
      regsSnap.docs.forEach((d) => {
        batch.update(d.ref, { userDeleted: true, status: "CANCELLED", accountDeletedAt: nowIso });
      });
    } catch (_) {}

    await batch.commit();

    // 5. Firebase Auth Revocation & Account Deletion
    try {
      await adminAuth.revokeRefreshTokens(targetUserId);
    } catch (revokeErr) {
      console.warn("[Admin User Delete API] Warning revoking refresh tokens:", revokeErr);
    }

    try {
      await adminAuth.deleteUser(targetUserId);
      console.log(`[Admin User Delete API] Firebase Auth account successfully deleted for UID: ${targetUserId}`);
    } catch (authErr: any) {
      console.warn(`[Admin User Delete API] Auth delete User warning (user may already be removed from Auth):`, authErr.message);
    }

    // 6. Audit Log
    try {
      await adminDb.collection("activity_logs").add({
        action: "USER_DELETED_BY_ADMIN",
        targetUserId,
        targetEmail,
        performedBy: requesterEmail || requesterUid,
        createdAt: nowIso,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: "User account and all associated data permanently deleted.",
    });

  } catch (err: any) {
    console.error("[Admin User Delete API] Exception:", err);
    return NextResponse.json({ error: err.message || "Failed to delete user account." }, { status: 500 });
  }
}
