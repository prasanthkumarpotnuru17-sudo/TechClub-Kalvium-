import {
  collection, doc, getDocs, onSnapshot, query, orderBy, updateDoc, deleteDoc, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserItem } from "@/lib/services/mockData";

const USERS_COLLECTION = "users";

export const userService = {
  // Helper to deduplicate raw users list by email and clean up redundant Firestore documents
  deduplicateAndCleanUsers(rawUsers: UserItem[]): UserItem[] {
    const rolePriority: Record<string, number> = {
      super_admin: 4,
      admin: 3,
      coordinator: 2,
      member: 1,
    };

    const emailMap = new Map<string, UserItem>();
    const duplicateIdsToDelete: string[] = [];

    for (const u of rawUsers) {
      const emailKey = (u.email || "").toLowerCase().trim();
      if (!emailKey) {
        emailMap.set(u.id, u);
        continue;
      }

      if (!emailMap.has(emailKey)) {
        emailMap.set(emailKey, u);
      } else {
        const existing = emailMap.get(emailKey)!;
        const existingScore = rolePriority[existing.role] || 1;
        const currentScore = rolePriority[u.role] || 1;

        if (currentScore > existingScore) {
          duplicateIdsToDelete.push(existing.id);
          emailMap.set(emailKey, u);
        } else {
          duplicateIdsToDelete.push(u.id);
        }
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      console.warn(`[userService] Cleaning up ${duplicateIdsToDelete.length} duplicate user documents from Firestore:`, duplicateIdsToDelete);
      duplicateIdsToDelete.forEach((dupId) => {
        deleteDoc(doc(db, USERS_COLLECTION, dupId)).catch((err) => {
          console.warn(`[userService] Could not delete duplicate user doc ${dupId}:`, err);
        });
      });
    }

    return Array.from(emailMap.values());
  },

  // Real-time listener for all users
  subscribeUsers(callback: (users: UserItem[]) => void, onError?: (error: any) => void): () => void {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const rawUsers: UserItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || data.displayName || "User",
          email: (data.email || "").trim(),
          avatar: data.avatar || data.photoURL || undefined,
          role: data.role || "member",
          department: data.department || "",
          year: data.academicYear || data.year || "",
          signupMethod: "Email / Password",
          eventsAttended: data.eventsAttended || 0,
          joinedDate: data.createdAt || "July 2026",
          status: data.status || "Active",
        } as UserItem;
      });
      const cleanUsers = this.deduplicateAndCleanUsers(rawUsers);
      callback(cleanUsers);
    }, (error) => {
      console.error("Error subscribing to users:", error);
      if (onError) onError(error);
      else callback([]);
    });
  },

  // Get users once
  async getUsers(): Promise<UserItem[]> {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    const rawUsers: UserItem[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || data.displayName || "User",
        email: (data.email || "").trim(),
        avatar: data.avatar || data.photoURL || undefined,
        role: data.role || "member",
        department: data.department || "",
        year: data.academicYear || data.year || "",
        signupMethod: "Email / Password",
        eventsAttended: data.eventsAttended || 0,
        joinedDate: data.createdAt || "July 2026",
        status: data.status || "Active",
      } as UserItem;
    });
    return this.deduplicateAndCleanUsers(rawUsers);
  },

  // Role updates are handled strictly via POST /api/admin/role server API using Admin SDK.
  async updateUserRole(id: string, role: string, email?: string): Promise<void> {
    if (email) {
      const { teamAccessService } = await import("@/services/teamAccessService");
      if (role === "member") {
        await teamAccessService.removeTeamAccess(email, id);
      } else {
        await teamAccessService.addOrUpdateTeamAccess(email, role as any, id);
      }
      return;
    }
    console.warn("[userService] Role mutations are managed strictly via server API (/api/admin/role). Client update skipped.");
  },

  // Update user status (Active / Blocked)
  async updateUserStatus(id: string, status: "Active" | "Blocked"): Promise<void> {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, id), { status, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn("[userService] Client updateDoc notice for user status:", err);
      try {
        const { safeSetDoc } = await import("@/lib/firestoreUtils");
        await safeSetDoc(doc(db, USERS_COLLECTION, id), { status, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (_) {}
    }
  },

  // Delete user document (Admin panel deletion via Server API)
  async deleteUser(id: string, email?: string, idToken?: string): Promise<void> {
    if (idToken) {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ targetUserId: id, targetEmail: email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user account.");
      }
      return;
    }

    // Direct Firestore deletion fallback
    await deleteDoc(doc(db, USERS_COLLECTION, id));
    try {
      await deleteDoc(doc(db, "profiles", id));
    } catch (e) {
      console.warn("Could not delete profile doc:", e);
    }
  },

  // Delete active user account via API route
  async deleteUserAccount(idToken: string): Promise<void> {
    const res = await fetch("/api/user/delete-account", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to delete account.");
    }
  },

  // Search users by email or name (client-side filtering for simplicity, or just fetch all and filter)
  async searchUsers(searchQuery: string): Promise<UserItem[]> {
    const allUsers = await this.getUsers();
    const queryLower = searchQuery.toLowerCase();
    return allUsers.filter(u => 
      u.email.toLowerCase().includes(queryLower) || 
      u.name.toLowerCase().includes(queryLower)
    );
  },

  // Get administrative users
  async getAdministrativeUsers(): Promise<UserItem[]> {
    const q = query(
      collection(db, USERS_COLLECTION), 
      where("role", "in", ["admin", "super_admin", "coordinator"])
    );
    const snap = await getDocs(q);
    const rawUsers: UserItem[] = snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || data.displayName || "User",
        email: (data.email || "").trim(),
        avatar: data.avatar || data.photoURL || undefined,
        role: data.role || "member",
        department: data.department || "",
        year: data.academicYear || data.year || "",
        signupMethod: "Email / Password",
        eventsAttended: data.eventsAttended || 0,
        joinedDate: data.createdAt || "July 2026",
        status: data.status || "Active",
      } as UserItem;
    });
    return this.deduplicateAndCleanUsers(rawUsers);
  }
};
