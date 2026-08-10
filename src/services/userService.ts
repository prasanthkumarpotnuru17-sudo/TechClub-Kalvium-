import {
  collection, doc, getDocs, onSnapshot, query, orderBy, updateDoc, deleteDoc, where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserItem } from "@/lib/services/mockData";

const USERS_COLLECTION = "users";

export const userService = {
  // Real-time listener for all users
  subscribeUsers(callback: (users: UserItem[]) => void, onError?: (error: any) => void): () => void {
    const q = query(collection(db, USERS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const users: UserItem[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || data.displayName || "User",
          email: data.email || "",
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
      callback(users);
    }, (error) => {
      console.error("Error subscribing to users:", error);
      if (onError) onError(error);
      else callback([]);
    });
  },

  // Get users once
  async getUsers(): Promise<UserItem[]> {
    const snap = await getDocs(collection(db, USERS_COLLECTION));
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || data.displayName || "User",
        email: data.email || "",
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
  },

  // Update user role in Firestore
  async updateUserRole(id: string, role: string): Promise<void> {
    try {
      await updateDoc(doc(db, USERS_COLLECTION, id), { role, updatedAt: new Date().toISOString() });
    } catch (err) {
      console.warn("[userService] Client updateDoc notice for user role:", err);
      try {
        const { safeSetDoc } = await import("@/lib/firestoreUtils");
        await safeSetDoc(doc(db, USERS_COLLECTION, id), { role, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (_) {}
    }
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

  // Delete user document (Admin panel direct deletion)
  async deleteUser(id: string): Promise<void> {
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
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || data.displayName || "User",
        email: data.email || "",
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
  }
};
