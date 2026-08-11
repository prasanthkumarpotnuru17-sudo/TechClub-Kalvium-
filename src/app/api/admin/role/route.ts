import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authorization Header presence
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing or invalid authorization header." },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Empty token provided." },
        { status: 401 }
      );
    }

    // 2. Verify Firebase Admin SDK configuration
    if (!isAdminSdkConfigured || !adminAuth || !adminDb) {
      console.error("[Admin Role API] Firebase Admin SDK is not initialized.");
      return NextResponse.json(
        { success: false, error: "Server Configuration Error: Firebase Admin SDK is not initialized." },
        { status: 500 }
      );
    }

    // 3. Verify Firebase ID Token
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authErr: any) {
      console.warn("[Admin Role API] Token verification failed:", authErr?.message || authErr);
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const requesterUid = decodedToken.uid;
    const requesterEmail = (decodedToken.email || "").trim().toLowerCase();

    if (!requesterEmail) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Token email is missing." },
        { status: 401 }
      );
    }

    // 4. Canonical Role Verification — ONLY team_access collection
    // users.role is NOT used to authorize role-management operations.
    const requesterTeamSnap = await adminDb.collection("team_access").doc(requesterEmail).get();
    let requesterRole = "";
    if (requesterTeamSnap.exists) {
      const data = requesterTeamSnap.data();
      if (data?.status === "active") {
        requesterRole = data.role || "";
      }
    }

    const validPrivilegedRoles = ["super_admin", "admin", "coordinator"];
    if (!validPrivilegedRoles.includes(requesterRole)) {
      console.warn("[Admin Role API] Unauthorized access attempt:", { requesterUid, requesterEmail, requesterRole });
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have team management permissions." },
        { status: 403 }
      );
    }

    // 5. Parse Request Body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const { targetEmail, role, userId } = body;

    if (!targetEmail || !role) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: targetEmail and role are required." },
        { status: 400 }
      );
    }

    const normalizedTargetEmail = targetEmail.trim().toLowerCase();
    const validRoles = ["super_admin", "admin", "coordinator", "member"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: "Invalid role specified." },
        { status: 400 }
      );
    }

    // 6. Strict Role Hierarchy Verification
    // - Only SUPER_ADMIN can assign the super_admin role.
    // - Only SUPER_ADMIN can modify an existing super_admin's role.
    const targetTeamSnap = await adminDb.collection("team_access").doc(normalizedTargetEmail).get();
    const existingTargetRole = targetTeamSnap.exists ? targetTeamSnap.data()?.role : null;

    const isAssigningSuperAdmin = role === "super_admin";
    const isModifyingSuperAdmin = existingTargetRole === "super_admin";

    if (isAssigningSuperAdmin || isModifyingSuperAdmin) {
      if (requesterRole !== "super_admin") {
        return NextResponse.json(
          { success: false, error: "Forbidden: Only a Super Admin can assign or alter Super Admin roles." },
          { status: 403 }
        );
      }
    }

    // 7. Execute Server-side Updates via Admin SDK
    const nowIso = new Date().toISOString();

    if (role === "member") {
      // Demote to member: delete team_access doc
      await adminDb.collection("team_access").doc(normalizedTargetEmail).delete().catch((e) => {
        console.warn("[Admin Role API] Non-fatal deletion warning for team_access:", e?.message);
      });

      // Clean up admin_uids
      if (userId) {
        await adminDb.collection("admin_uids").doc(userId).delete().catch(() => {});
      } else {
        const uidsSnap = await adminDb.collection("admin_uids").where("email", "==", normalizedTargetEmail).get();
        uidsSnap.docs.forEach((d) => d.ref.delete());
      }

      // Update users collection
      if (userId) {
        await adminDb.collection("users").doc(userId).set({ role: "member", updatedAt: nowIso }, { merge: true }).catch(() => {});
      } else {
        const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
        usersSnap.docs.forEach((d) => d.ref.set({ role: "member", updatedAt: nowIso }, { merge: true }));
      }
    } else {
      // Promote / Change to admin, super_admin, or coordinator
      await adminDb.collection("team_access").doc(normalizedTargetEmail).set({
        email: normalizedTargetEmail,
        role,
        status: "active",
        updatedAt: nowIso
      }, { merge: true });

      // Update users collection and admin_uids
      let targetUid = userId;
      if (!targetUid) {
        const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
        }
      }

      if (targetUid) {
        await adminDb.collection("users").doc(targetUid).set({ role, updatedAt: nowIso }, { merge: true }).catch(() => {});
        await adminDb.collection("admin_uids").doc(targetUid).set({ email: normalizedTargetEmail, role, seededAt: nowIso }, { merge: true }).catch(() => {});
      } else {
        const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
        usersSnap.docs.forEach((d) => d.ref.set({ role, updatedAt: nowIso }, { merge: true }));
      }
    }

    // Safe logging (no credentials or tokens logged)
    console.log("[Admin Role API] Success:", {
      requesterUid,
      requesterEmail,
      requesterRole,
      targetEmail: normalizedTargetEmail,
      targetRole: role,
      status: 200
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated role for ${normalizedTargetEmail} to ${role}.`
    });
  } catch (err: any) {
    console.error("[Admin Role API] Unexpected server error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

