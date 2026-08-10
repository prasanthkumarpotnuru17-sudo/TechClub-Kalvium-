import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid authorization token." },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Empty token provided." }, { status: 401 });
    }

    if (!isAdminSdkConfigured || !adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server Configuration Error: Firebase Admin SDK is not initialized." },
        { status: 500 }
      );
    }

    // 1. Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err: any) {
      console.error("[Account Deletion API] Token verification failed:", err);
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const uid = decodedToken.uid;
    const email = (decodedToken.email || "").toLowerCase().trim();

    if (!uid) {
      return NextResponse.json({ error: "Invalid token: UID not found." }, { status: 400 });
    }

    // 2. Check Super Admin Protection
    if (email) {
      const teamAccessRef = adminDb.collection("team_access").doc(email);
      const teamSnap = await teamAccessRef.get();
      if (teamSnap.exists && teamSnap.data()?.role === "super_admin") {
        const superAdminsSnap = await adminDb
          .collection("team_access")
          .where("role", "==", "super_admin")
          .get();

        if (superAdminsSnap.size <= 1) {
          return NextResponse.json(
            {
              error:
                "Cannot delete account: You are the sole Super Admin. Please assign another Super Admin before deleting your account.",
            },
            { status: 403 }
          );
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 3. Write Activity Audit Log
    try {
      await adminDb.collection("activity_logs").add({
        action: "ACCOUNT_DELETED",
        userId: uid,
        userEmail: email,
        performedBy: "self",
        createdAt: nowIso,
      });
    } catch (logErr) {
      console.warn("[Account Deletion API] Non-critical error writing audit log:", logErr);
    }

    // 4. Firestore Atomic Batch Execution
    const batch = adminDb.batch();

    // Delete users/{uid}
    const userRef = adminDb.collection("users").doc(uid);
    batch.delete(userRef);

    // Delete profiles/{uid}
    const profileRef = adminDb.collection("profiles").doc(uid);
    batch.delete(profileRef);

    // Delete admin_uids/{uid} if exists
    const adminUidRef = adminDb.collection("admin_uids").doc(uid);
    batch.delete(adminUidRef);

    // Delete team_access/{email} if email exists
    if (email) {
      const teamAccessRef = adminDb.collection("team_access").doc(email);
      batch.delete(teamAccessRef);
    }

    // Mark user registrations as deleted/anonymized
    try {
      const regsByUid = await adminDb
        .collection("registrations")
        .where("userId", "==", uid)
        .get();

      regsByUid.docs.forEach((doc) => {
        batch.update(doc.ref, {
          userDeleted: true,
          displayName: "Deleted User",
          accountDeletedAt: nowIso,
        });
      });

      if (email) {
        const regsByEmail = await adminDb
          .collection("registrations")
          .where("userEmail", "==", email)
          .get();

        regsByEmail.docs.forEach((doc) => {
          batch.update(doc.ref, {
            userDeleted: true,
            displayName: "Deleted User",
            accountDeletedAt: nowIso,
          });
        });
      }
    } catch (regErr) {
      console.warn("[Account Deletion API] Warning processing registrations batch:", regErr);
    }

    // Mark user certificates as userDeleted=true (preserving verification data)
    try {
      const certsByUid = await adminDb
        .collection("certificates")
        .where("userId", "==", uid)
        .get();

      certsByUid.docs.forEach((doc) => {
        batch.update(doc.ref, {
          userDeleted: true,
          accountDeletedAt: nowIso,
        });
      });

      if (email) {
        const certsByEmail = await adminDb
          .collection("certificates")
          .where("userEmail", "==", email)
          .get();

        certsByEmail.docs.forEach((doc) => {
          batch.update(doc.ref, {
            userDeleted: true,
            accountDeletedAt: nowIso,
          });
        });
      }
    } catch (certErr) {
      console.warn("[Account Deletion API] Warning processing certificates batch:", certErr);
    }

    // Commit batch
    await batch.commit();

    // 5. Revoke Refresh Tokens & Delete Auth User
    try {
      await adminAuth.revokeRefreshTokens(uid);
    } catch (revokeErr) {
      console.warn("[Account Deletion API] Warning revoking refresh tokens:", revokeErr);
    }

    try {
      await adminAuth.deleteUser(uid);
    } catch (authErr: any) {
      console.error("[Account Deletion API] Error deleting Auth user:", authErr);
    }

    return NextResponse.json({
      success: true,
      message: "Account and associated data deleted successfully.",
    });
  } catch (error: any) {
    console.error("[Account Deletion API] Unhandled Exception:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process account deletion." },
      { status: 500 }
    );
  }
}
