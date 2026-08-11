import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    let requesterEmail = "";
    let requesterRole = "";

    // 1. Verify Authorization Token if provided
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1]?.trim();
      if (token && isAdminSdkConfigured && adminAuth && adminDb) {
        try {
          const decoded = await adminAuth.verifyIdToken(token);
          requesterEmail = (decoded.email || "").toLowerCase().trim();
          
          if (requesterEmail) {
            const teamSnap = await adminDb.collection("team_access").doc(requesterEmail).get();
            if (teamSnap.exists) {
              requesterRole = teamSnap.data()?.role || "";
            }
          }
          if (!requesterRole && decoded.uid) {
            const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
            if (userSnap.exists) {
              requesterRole = userSnap.data()?.role || "";
            }
          }
        } catch (authErr) {
          console.warn("[Admin Role API] Token verification warning:", authErr);
        }
      }
    }

    const body = await req.json();
    const { targetEmail, role, userId } = body;

    if (!targetEmail || !role) {
      return NextResponse.json(
        { error: "Missing required parameters: targetEmail and role are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = targetEmail.trim().toLowerCase();
    const validRoles = ["super_admin", "admin", "coordinator", "member"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified." },
        { status: 400 }
      );
    }

    // 2. Strict Role Promotion Authorization Rules:
    // - Only SUPER_ADMIN can assign the super_admin role.
    // - Only SUPER_ADMIN can modify an existing super_admin's role.
    if (isAdminSdkConfigured && adminDb) {
      const targetTeamSnap = await adminDb.collection("team_access").doc(normalizedEmail).get();
      const existingTargetRole = targetTeamSnap.exists ? targetTeamSnap.data()?.role : null;

      const isAssigningSuperAdmin = role === "super_admin";
      const isModifyingSuperAdmin = existingTargetRole === "super_admin";

      if (isAssigningSuperAdmin || isModifyingSuperAdmin) {
        if (requesterRole !== "super_admin") {
          return NextResponse.json(
            { error: "Forbidden: Only a Super Admin can assign or alter Super Admin roles." },
            { status: 403 }
          );
        }
      }
    }

    // 3. Server-side Admin SDK update
    if (isAdminSdkConfigured && adminDb) {
      const nowIso = new Date().toISOString();

      if (role === "member") {
        // Demote to member: delete team_access doc
        await adminDb.collection("team_access").doc(normalizedEmail).delete().catch(() => {});

        // Clean up admin_uids
        if (userId) {
          await adminDb.collection("admin_uids").doc(userId).delete().catch(() => {});
        } else {
          const uidsSnap = await adminDb.collection("admin_uids").where("email", "==", normalizedEmail).get();
          uidsSnap.docs.forEach((d) => d.ref.delete());
        }

        // Update users collection
        if (userId) {
          await adminDb.collection("users").doc(userId).set({ role: "member", updatedAt: nowIso }, { merge: true }).catch(() => {});
        } else {
          const usersSnap = await adminDb.collection("users").where("email", "==", normalizedEmail).get();
          usersSnap.docs.forEach((d) => d.ref.set({ role: "member", updatedAt: nowIso }, { merge: true }));
        }
      } else {
        // Promote / Change to admin, super_admin, or coordinator
        await adminDb.collection("team_access").doc(normalizedEmail).set({
          email: normalizedEmail,
          role,
          status: "active",
          updatedAt: nowIso
        }, { merge: true });

        // Update users collection
        let targetUid = userId;
        if (!targetUid) {
          const usersSnap = await adminDb.collection("users").where("email", "==", normalizedEmail).get();
          if (!usersSnap.empty) {
            targetUid = usersSnap.docs[0].id;
          }
        }

        if (targetUid) {
          await adminDb.collection("users").doc(targetUid).set({ role, updatedAt: nowIso }, { merge: true }).catch(() => {});
          await adminDb.collection("admin_uids").doc(targetUid).set({ email: normalizedEmail, role, seededAt: nowIso }, { merge: true }).catch(() => {});
        } else {
          const usersSnap = await adminDb.collection("users").where("email", "==", normalizedEmail).get();
          usersSnap.docs.forEach((d) => d.ref.set({ role, updatedAt: nowIso }, { merge: true }));
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully updated role for ${normalizedEmail} to ${role}.`
      });
    }

    return NextResponse.json({
      success: true,
      message: "Role update processed."
    });
  } catch (err: any) {
    console.error("[Admin Role API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
