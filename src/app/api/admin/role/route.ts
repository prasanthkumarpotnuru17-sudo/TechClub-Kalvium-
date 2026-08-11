import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    console.log("[ROLE API] STEP 1 - request received");

    // 1. Parse Request Body FIRST
    const body = await req.json().catch((err) => {
      console.warn("[ROLE API] STEP 2 - Failed to parse request JSON body:", err);
      return null;
    });

    if (!body) {
      console.warn("[ROLE API] STEP 2 - Invalid or missing JSON request body");
      return NextResponse.json(
        { success: false, error: "Bad Request: Invalid or missing JSON request body." },
        { status: 400 }
      );
    }

    const { targetEmail, role, userId } = body;
    console.log("[ROLE API] STEP 2 - body parsed", {
      hasTargetEmail: Boolean(targetEmail),
      role,
      hasUserId: Boolean(userId)
    });

    // 2. Parameter Validation & Normalization
    if (!targetEmail || !role) {
      console.warn("[ROLE API] STEP 2.1 - Missing targetEmail or role parameters");
      return NextResponse.json(
        { success: false, error: "Missing required parameters: targetEmail and role are required." },
        { status: 400 }
      );
    }

    const normalizedTargetEmail = String(targetEmail).trim().toLowerCase();
    const validRoles = ["super_admin", "admin", "coordinator", "member"];
    if (!validRoles.includes(role)) {
      console.warn("[ROLE API] STEP 2.2 - Invalid role specified:", role);
      return NextResponse.json(
        { success: false, error: `Invalid role specified: ${role}` },
        { status: 400 }
      );
    }

    // 3. Authorization Header check
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    console.log("[ROLE API] STEP 3 - authorization header check", { hasAuthHeader: Boolean(authHeader) });

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("[ROLE API] STEP 3.1 - Missing or invalid Authorization header");
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing or invalid authorization header." },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1]?.trim();
    if (!token) {
      console.warn("[ROLE API] STEP 3.2 - Empty Bearer token provided");
      return NextResponse.json(
        { success: false, error: "Unauthorized: Empty Bearer token provided." },
        { status: 401 }
      );
    }

    // 4. Firebase Admin SDK runtime verification
    console.log("[ROLE API] STEP 4 - Firebase Admin runtime check", {
      projectIdConfigured: Boolean(process.env.FIREBASE_PROJECT_ID),
      clientEmailConfigured: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
      privateKeyConfigured: Boolean(process.env.FIREBASE_PRIVATE_KEY),
      isAdminSdkConfigured,
      hasAdminAuth: Boolean(adminAuth),
      hasAdminDb: Boolean(adminDb)
    });

    if (!isAdminSdkConfigured || !adminAuth || !adminDb) {
      console.error("[ROLE API] STEP 4.1 - Firebase Admin SDK is not initialized.");
      return NextResponse.json(
        { success: false, error: "Server Configuration Error: Firebase Admin SDK is not initialized." },
        { status: 500 }
      );
    }

    // 5. Firebase ID Token Verification
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log("[ROLE API] STEP 5 - token verified successfully");
    } catch (authErr: any) {
      console.warn("[ROLE API] STEP 5.1 - Token verification failed:", authErr?.message || authErr);
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const requesterUid = decodedToken.uid;
    const requesterEmail = (decodedToken.email || "").trim().toLowerCase();

    console.log("[ROLE API] STEP 6 - requester email:", requesterEmail, "requester UID:", requesterUid);

    if (!requesterEmail) {
      console.warn("[ROLE API] STEP 6.1 - Token email is missing");
      return NextResponse.json(
        { success: false, error: "Unauthorized: Token email is missing." },
        { status: 401 }
      );
    }

    // 6. Canonical Role Verification — ONLY team_access collection
    // users.role is NOT used to authorize role-management operations.
    console.log("[ROLE API] STEP 7 - requester team_access lookup starting...");
    let requesterRole = "";
    try {
      const requesterTeamSnap = await adminDb.collection("team_access").doc(requesterEmail).get();
      console.log("[ROLE API] STEP 7.1 - requester team_access doc retrieved, exists:", requesterTeamSnap.exists);
      if (requesterTeamSnap.exists) {
        const data = requesterTeamSnap.data();
        if (data?.status === "active") {
          requesterRole = data?.role || "";
        }
      }
    } catch (err) {
      console.error("[ROLE API] STEP 7.2 - Failed to fetch requester team_access document:", err);
      throw err;
    }

    console.log("[ROLE API] STEP 8 - requester role resolved:", requesterRole);

    const validPrivilegedRoles = ["super_admin", "admin", "coordinator"];
    if (!validPrivilegedRoles.includes(requesterRole)) {
      console.warn("[ROLE API] STEP 8.1 - Forbidden access attempt:", { requesterUid, requesterEmail, requesterRole });
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have team management permissions." },
        { status: 403 }
      );
    }

    console.log("[ROLE API] STEP 9 - target:", normalizedTargetEmail, "requested role:", role);

    // 7. Strict Role Hierarchy Verification
    // - Only SUPER_ADMIN can assign the super_admin role.
    // - Only SUPER_ADMIN can modify an existing super_admin's role.
    console.log("[ROLE API] STEP 10 - target team_access lookup starting...");
    let existingTargetRole: string | null = null;
    try {
      const targetTeamSnap = await adminDb.collection("team_access").doc(normalizedTargetEmail).get();
      console.log("[ROLE API] STEP 10.1 - target team_access doc retrieved, exists:", targetTeamSnap.exists);
      if (targetTeamSnap.exists) {
        existingTargetRole = targetTeamSnap.data()?.role || null;
      }
    } catch (err) {
      console.error("[ROLE API] STEP 10.2 - Failed to fetch target team_access document:", err);
      throw err;
    }

    console.log("[ROLE API] STEP 10.3 - existing target role resolved:", existingTargetRole);

    const isAssigningSuperAdmin = role === "super_admin";
    const isModifyingSuperAdmin = existingTargetRole === "super_admin";

    if (isAssigningSuperAdmin || isModifyingSuperAdmin) {
      if (requesterRole !== "super_admin") {
        console.warn("[ROLE API] STEP 10.4 - Non-super-admin attempted to touch Super Admin role");
        return NextResponse.json(
          { success: false, error: "Forbidden: Only a Super Admin can assign or alter Super Admin roles." },
          { status: 403 }
        );
      }
    }

    // Lookup target UID if missing
    let targetUid = userId;
    if (!targetUid) {
      console.log("[ROLE API] STEP 10.5 - targetUid missing, querying users collection by email...");
      try {
        const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
        if (!usersSnap.empty) {
          targetUid = usersSnap.docs[0].id;
          console.log("[ROLE API] STEP 10.6 - targetUid found from users query:", targetUid);
        } else {
          console.log("[ROLE API] STEP 10.6 - no matching users doc found for email:", normalizedTargetEmail);
        }
      } catch (err) {
        console.error("[ROLE API] STEP 10.7 - Failed to query users collection by email:", err);
        throw err;
      }
    }

    // 8. Sequential Server-side Database Operations via Admin SDK
    const nowIso = new Date().toISOString();
    let teamAccessUpdated = false;
    let userUpdated = false;
    let adminUidUpdated = false;

    if (role === "member") {
      console.log("[ROLE API] STEP 11 - demote/revoke to member starting...");
      try {
        console.log("[ROLE API] STEP 11.1 - deleting team_access doc for target:", normalizedTargetEmail);
        await adminDb.collection("team_access").doc(normalizedTargetEmail).delete();
        teamAccessUpdated = true;
        console.log("[ROLE API] STEP 11.2 - team_access doc deleted successfully.");
      } catch (err) {
        console.error("[ROLE API] STEP 11.3 - Failed to delete team_access doc:", err);
        throw err;
      }

      console.log("[ROLE API] STEP 12 - cleaning admin_uids...");
      if (targetUid) {
        try {
          console.log("[ROLE API] STEP 12.1 - deleting admin_uids doc for UID:", targetUid);
          await adminDb.collection("admin_uids").doc(targetUid).delete();
          adminUidUpdated = true;
          console.log("[ROLE API] STEP 12.2 - admin_uids doc deleted successfully.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.3 - Failed to delete admin_uids by UID:", err);
        }
      } else {
        try {
          const uidsSnap = await adminDb.collection("admin_uids").where("email", "==", normalizedTargetEmail).get();
          for (const d of uidsSnap.docs) {
            await d.ref.delete();
          }
          adminUidUpdated = true;
          console.log("[ROLE API] STEP 12.4 - admin_uids clean up by email completed.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.5 - Failed to clean up admin_uids by email:", err);
        }
      }

      console.log("[ROLE API] STEP 12.6 - updating users collection to member...");
      if (targetUid) {
        try {
          await adminDb.collection("users").doc(targetUid).set({ role: "member", updatedAt: nowIso }, { merge: true });
          userUpdated = true;
          console.log("[ROLE API] STEP 12.7 - users doc updated to member by UID.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.8 - Failed to update users doc by UID:", err);
          throw err;
        }
      } else {
        try {
          const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
          for (const d of usersSnap.docs) {
            await d.ref.set({ role: "member", updatedAt: nowIso }, { merge: true });
          }
          userUpdated = true;
          console.log("[ROLE API] STEP 12.9 - users docs updated to member by email.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.10 - Failed to update users docs by email:", err);
          throw err;
        }
      }
    } else {
      console.log("[ROLE API] STEP 11 - promote/update role to", role, "starting...");
      try {
        console.log("[ROLE API] STEP 11.1 - setting team_access doc for target:", normalizedTargetEmail, "role:", role);
        await adminDb.collection("team_access").doc(normalizedTargetEmail).set({
          email: normalizedTargetEmail,
          role,
          status: "active",
          updatedAt: nowIso
        }, { merge: true });
        teamAccessUpdated = true;
        console.log("[ROLE API] STEP 11.2 - team_access doc set successfully.");
      } catch (err) {
        console.error("[ROLE API] STEP 11.3 - Failed to set team_access doc:", err);
        throw err;
      }

      console.log("[ROLE API] STEP 12 - sync users and admin_uids collection...");
      if (targetUid) {
        try {
          console.log("[ROLE API] STEP 12.1 - setting users doc for UID:", targetUid, "role:", role);
          await adminDb.collection("users").doc(targetUid).set({ role, updatedAt: nowIso }, { merge: true });
          userUpdated = true;
          console.log("[ROLE API] STEP 12.2 - users doc set successfully.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.3 - Failed to set users doc by UID:", err);
          throw err;
        }

        try {
          console.log("[ROLE API] STEP 12.4 - setting admin_uids doc for UID:", targetUid, "role:", role);
          await adminDb.collection("admin_uids").doc(targetUid).set({ email: normalizedTargetEmail, role, seededAt: nowIso }, { merge: true });
          adminUidUpdated = true;
          console.log("[ROLE API] STEP 12.5 - admin_uids doc set successfully.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.6 - Failed to set admin_uids doc by UID:", err);
          throw err;
        }
      } else {
        try {
          console.log("[ROLE API] STEP 12.7 - targetUid missing, updating users docs by email...");
          const usersSnap = await adminDb.collection("users").where("email", "==", normalizedTargetEmail).get();
          for (const d of usersSnap.docs) {
            await d.ref.set({ role, updatedAt: nowIso }, { merge: true });
          }
          userUpdated = true;
          console.log("[ROLE API] STEP 12.8 - users docs set by email successfully.");
        } catch (err) {
          console.error("[ROLE API] STEP 12.9 - Failed to set users docs by email:", err);
          throw err;
        }
      }
    }

    console.log("[ROLE API] STEP 13 - success! Role update completed safely.", {
      requesterUid,
      requesterEmail,
      requesterRole,
      targetEmail: normalizedTargetEmail,
      targetRole: role,
      status: 200
    });

    return NextResponse.json({
      success: true,
      role,
      teamAccessUpdated,
      userUpdated,
      adminUidUpdated,
      message: `Successfully updated role for ${normalizedTargetEmail} to ${role}.`
    });
  } catch (error: any) {
    console.error("[ROLE API] FATAL ERROR", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal role management error"
      },
      { status: 500 }
    );
  }
}





