import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  collection, 
  onSnapshot, 
  query, 
  where,
  serverTimestamp, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TeamAccess {
  email: string;
  role: "super_admin" | "admin" | "coordinator";
  status: "active" | "inactive";
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

const COLLECTION_NAME = "team_access";
const ADMIN_UIDS_COLLECTION = "admin_uids";

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper — find and delete every admin_uids document for a given email.
//
// admin_uids documents are keyed by Firebase Auth UID, but each document
// stores { email } so we can reverse-look them up when we only have the email.
//
// This is called whenever access is revoked so the Firestore list rule
// (isAdminUid) stops passing immediately — no manual cleanup required.
// ─────────────────────────────────────────────────────────────────────────────
async function revokeAdminUidByEmail(email: string): Promise<void> {
  try {
    const normalized = email.trim().toLowerCase();
    const q = query(
      collection(db, ADMIN_UIDS_COLLECTION),
      where("email", "==", normalized)
    );
    const snap = await getDocs(q);
    // Delete every matching document (should normally be exactly one)
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (err) {
    // Log but do not propagate — the team_access deletion already succeeded.
    // On next login the removed user won't be re-seeded because team_access
    // no longer has an active record for them.
    console.warn("[teamAccessService] Could not clean up admin_uids entry:", err);
  }
}

export const teamAccessService = {

  // ── Normalize email ─────────────────────────────────────────────
  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  },

  // ── Seed admin_uids/{uid} ──────────────────────────────────────
  // Called automatically on every successful login for admin/coordinator/super_admin.
  // Idempotent — safe to call multiple times.
  async seedAdminUid(uid: string, email: string, role: string): Promise<void> {
    console.log(`[teamAccessService] seedAdminUid executing for uid=${uid}, email=${email}, role=${role}`);
    if (!uid) return;
    try {
      const targetRef = doc(db, ADMIN_UIDS_COLLECTION, uid);
      console.log("[teamAccessService] writing to admin_uids:", targetRef.path);
      await setDoc(
        targetRef,
        { email: email.trim().toLowerCase(), role, seededAt: serverTimestamp() },
        { merge: true }
      );
      console.log("[teamAccessService] seedAdminUid success.");
    } catch (error) {
      console.error("[teamAccessService] seedAdminUid failed:", error);
      // Silently ignore — the app degrades gracefully (list falls back to
      // the isAuthenticated workaround if admin_uids write is blocked).
    }
  },

  // ── Remove admin_uids by UID ────────────────────────────────────
  // Use when the UID is already known (e.g. from Firebase Auth object).
  async removeAdminUid(uid: string): Promise<void> {
    if (!uid) return;
    try {
      await deleteDoc(doc(db, ADMIN_UIDS_COLLECTION, uid));
    } catch {
      // Silently ignore
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 1. fetchEffectiveRole(email, uid?)
  //
  // Primary role resolution entry point called on every login.
  // Passing uid enables auto-seeding admin_uids so the Firestore
  // list rule (isAdminUid) works immediately without manual setup.
  // ─────────────────────────────────────────────────────────────────
  async fetchEffectiveRole(
    email: string,
    uid?: string
  ): Promise<"super_admin" | "admin" | "coordinator" | "member"> {
    console.log("[teamAccessService] fetchEffectiveRole called:", { email, uid });
    if (!email) return "member";
    const normalized = this.normalizeEmail(email);
    console.log("[teamAccessService] normalized email:", normalized);

    try {
      const docRef = doc(db, COLLECTION_NAME, normalized);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as TeamAccess;
        if (data.status === "active") {
          if (uid && ["super_admin", "admin", "coordinator"].includes(data.role)) {
            await this.seedAdminUid(uid, normalized, data.role);
          }
          return data.role;
        }
        if (uid) {
          this.removeAdminUid(uid);
        }
      } else {
        // Fallback: Check users collection if team_access record does not exist yet
        if (uid) {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            const uRole = (uData.role || "").toLowerCase();
            if (["super_admin", "admin", "coordinator"].includes(uRole)) {
              const validRole = uRole as "super_admin" | "admin" | "coordinator";
              await this.addOrUpdateTeamAccess(normalized, validRole);
              await this.seedAdminUid(uid, normalized, validRole);
              return validRole;
            }
          }
        }
      }
    } catch (error) {
      console.error("[teamAccessService] Error fetching effective role:", error);
    }
    return "member";
  },

  // ─────────────────────────────────────────────────────────────────
  // Verify if an authenticated email/UID is an official Tech Club member
  // ─────────────────────────────────────────────────────────────────
  async isTechClubMember(email?: string | null, uid?: string | null): Promise<boolean> {
    if (!email && !uid) return false;
    const normalized = email ? this.normalizeEmail(email) : "";

    try {
      // 1. Check team_access collection
      if (normalized) {
        const docRef = doc(db, COLLECTION_NAME, normalized);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data()?.status === "active") {
          return true;
        }
      }

      // 2. Check users collection for super_admin/admin/coordinator role or explicit member flag
      if (uid) {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          const role = (data?.role || "").toLowerCase();
          if (["super_admin", "admin", "coordinator"].includes(role)) return true;
          if (data?.isTechClubMember === true || data?.isClubMember === true) return true;
        }
      }

      // 3. Check teams collection
      if (normalized) {
        const teamsSnap = await getDocs(query(collection(db, "teams"), where("email", "==", normalized)));
        if (!teamsSnap.empty) return true;
      }
    } catch (err) {
      console.error("[teamAccessService] Error checking Tech Club membership:", err);
    }

    return false;
  },

  async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      const { auth } = await import("@/lib/firebase");
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (_) {}
    return headers;
  },

  // ─────────────────────────────────────────────────────────────────
  // Helper: callRoleApi with safe content-type verification
  // ─────────────────────────────────────────────────────────────────
  async callRoleApi(payload: { targetEmail: string; role: string; userId?: string }): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/admin/role", {
      method: "POST",
      headers,
      body: JSON.stringify({
        targetEmail: this.normalizeEmail(payload.targetEmail),
        role: payload.role,
        userId: payload.userId,
      }),
    });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      const preview = text.slice(0, 200);
      throw new Error(
        `Role API returned non-JSON response (${res.status}): ${preview}`
      );
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Role API error (${res.status})`);
    }

    return data;
  },

  // ─────────────────────────────────────────────────────────────────
  // 2. addOrUpdateTeamAccess(email, role, userId?)
  // ─────────────────────────────────────────────────────────────────
  async addOrUpdateTeamAccess(
    email: string,
    role: "super_admin" | "admin" | "coordinator",
    userId?: string
  ): Promise<void> {
    const normalized = this.normalizeEmail(email);
    try {
      await this.callRoleApi({ targetEmail: normalized, role, userId });
    } catch (apiErr) {
      console.warn("[teamAccessService] API role endpoint notice:", apiErr);
      throw apiErr;
    }

    try {
      await setDoc(
        doc(db, COLLECTION_NAME, normalized),
        {
          email: normalized,
          role,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (clientErr) {
      console.warn("[teamAccessService] Client setDoc notice (handled via server API):", clientErr);
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 3. updateRole(email, role, userId?)
  // ─────────────────────────────────────────────────────────────────
  async updateRole(
    email: string,
    role: "super_admin" | "admin" | "coordinator",
    userId?: string
  ): Promise<void> {
    const normalized = this.normalizeEmail(email);
    try {
      await this.callRoleApi({ targetEmail: normalized, role, userId });
    } catch (apiErr) {
      console.warn("[teamAccessService] API role endpoint notice:", apiErr);
      throw apiErr;
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, normalized), {
        role,
        updatedAt: serverTimestamp(),
      });
    } catch (clientErr) {
      console.warn("[teamAccessService] Client updateDoc notice (handled via server API):", clientErr);
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 4. updateStatus(email, status)
  // ─────────────────────────────────────────────────────────────────
  async updateStatus(email: string, status: "active" | "inactive"): Promise<void> {
    const normalized = this.normalizeEmail(email);
    await updateDoc(doc(db, COLLECTION_NAME, normalized), {
      status,
      updatedAt: serverTimestamp(),
    });

    if (status === "inactive") {
      await revokeAdminUidByEmail(normalized);
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 5. removeTeamAccess(email)
  // ─────────────────────────────────────────────────────────────────
  async removeTeamAccess(email: string, userId?: string): Promise<void> {
    const normalized = this.normalizeEmail(email);
    try {
      await this.callRoleApi({ targetEmail: normalized, role: "member", userId });
    } catch (apiErr) {
      console.warn("[teamAccessService] API role endpoint notice:", apiErr);
      throw apiErr;
    }

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, normalized));
      await revokeAdminUidByEmail(normalized);
    } catch (clientErr) {
      console.warn("[teamAccessService] Client deleteDoc notice (handled via server API):", clientErr);
    }
  },

  // ─────────────────────────────────────────────────────────────────
  // 6. subscribeAllTeamAccess(callback)
  // ─────────────────────────────────────────────────────────────────
  subscribeAllTeamAccess(
    callback: (members: TeamAccess[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const q = query(collection(db, COLLECTION_NAME));
    return onSnapshot(
      q,
      (snapshot) => {
        const members: TeamAccess[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            email: data.email,
            role: data.role,
            status: data.status,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as TeamAccess;
        });
        callback(members);
      },
      (error) => {
        console.error("Error subscribing to team_access:", error);
        if (onError) onError(error);
        else callback([]);
      }
    );
  },
};
