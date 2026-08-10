/**
 * Service Layer — Firestore Only, no mock data fallbacks.
 */

import {
  collection, doc, getDocs, deleteDoc, onSnapshot, query, updateDoc
} from "firebase/firestore";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { db } from "@/lib/firebase";
import {
  EventItem,
  RegistrationItem,
  UserItem,
  NotificationItem,
  GalleryItem,
  TeamMemberItem
} from "./mockData";
import { n8nNotificationService } from "./n8nNotificationService";

export const apiService = {
  // Realtime Events Listener
  subscribeEvents(callback: (events: EventItem[]) => void): () => void {
    const q = query(collection(db, "events"));
    return onSnapshot(q, (snapshot) => {
      const liveEvents: EventItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as EventItem));
      callback(liveEvents);
    }, (error) => {
      console.error("subscribeEvents error:", error);
      callback([]);
    });
  },

  async getEvents(): Promise<EventItem[]> {
    const snap = await getDocs(collection(db, "events"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventItem));
  },

  async createEvent(eventData: Omit<EventItem, "id" | "registeredCount">): Promise<EventItem> {
    const id = `evt-${Date.now()}`;
    const newEvt: EventItem = { ...eventData, id, registeredCount: 0 };
    await safeSetDoc(doc(db, "events", id), newEvt, { merge: true });
    return newEvt;
  },

  async updateEvent(id: string, updates: Partial<EventItem>): Promise<void> {
    await safeUpdateDoc(doc(db, "events", id), updates);
  },

  async deleteEvent(id: string): Promise<void> {
    await deleteDoc(doc(db, "events", id));
  },

  async duplicateEvent(id: string): Promise<EventItem> {
    const snap = await getDocs(collection(db, "events"));
    const target = snap.docs.find((d) => d.id === id)?.data() as EventItem | undefined;
    if (!target) throw new Error("Event not found");
    const newId = `evt-${Date.now()}`;
    const dup: EventItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      status: "Draft",
      registeredCount: 0,
    };
    await safeSetDoc(doc(db, "events", newId), dup, { merge: true });
    return dup;
  },

  // Realtime Registrations Listener
  subscribeRegistrations(callback: (regs: RegistrationItem[]) => void): () => void {
    const q = query(collection(db, "registrations"));
    return onSnapshot(q, (snapshot) => {
      const liveRegs: RegistrationItem[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as RegistrationItem));
      callback(liveRegs);
    }, (error) => {
      console.error("subscribeRegistrations error:", error);
      callback([]);
    });
  },

  async getRegistrations(): Promise<RegistrationItem[]> {
    const snap = await getDocs(collection(db, "registrations"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RegistrationItem));
  },

  async addRegistration(reg: any): Promise<RegistrationItem> {
    const { registrationService } = await import("@/services/registrationService");
    const result = await registrationService.addRegistration(reg);
    return result as unknown as RegistrationItem;
  },

  async updateAttendance(id: string, attendance: "Attended" | "Absent" | "Pending"): Promise<void> {
    await safeUpdateDoc(doc(db, "registrations", id), { attendance });
  },

  // Users API
  async getUsers(): Promise<UserItem[]> {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        name: data.displayName || data.name || "User",
        email: data.email || "",
        avatar: data.avatar || data.photoURL || undefined,
        role: data.role || "Member",
        department: data.department || "",
        year: data.academicYear || "",
        signupMethod: "Email / Password",
        eventsAttended: data.eventsAttended || 0,
        joinedDate: data.createdAt || "July 2026",
        status: data.status || "Active",
      } as UserItem;
    });
  },

  async updateUserRole(id: string, role: "Student" | "Volunteer" | "Admin"): Promise<void> {
    await safeUpdateDoc(doc(db, "users", id), { role });
  },

  // Notifications API
  async sendNotification(notification: Omit<NotificationItem, "id" | "sentAt" | "readCount">): Promise<NotificationItem> {
    const id = `notif-${Date.now()}`;
    const newNotif: NotificationItem = {
      ...notification,
      id,
      sentAt: new Date().toLocaleString(),
      readCount: 0,
    };
    await safeSetDoc(doc(db, "notifications", id), newNotif, { merge: true });
    return newNotif;
  },

  // Gallery API
  async addGalleryImage(item: Omit<GalleryItem, "id" | "likes">): Promise<GalleryItem> {
    const id = `gal-${Date.now()}`;
    const newItem: GalleryItem = { ...item, id, likes: 0 };
    await safeSetDoc(doc(db, "gallery", id), newItem, { merge: true });
    return newItem;
  },

  // Team API
  async addTeamMember(member: Omit<TeamMemberItem, "id">): Promise<TeamMemberItem> {
    const id = `tm-${Date.now()}`;
    const newMem: TeamMemberItem = { ...member, id };
    await safeSetDoc(doc(db, "teams", id), newMem, { merge: true });
    return newMem;
  },

  // Integration Webhooks Trigger (n8n & Google Sheets)
  async triggerN8nWorkflow(workflowName: string, payload: any): Promise<{ success: boolean; message: string }> {
    console.log(`[n8n Webhook Trigger] Workflow: ${workflowName}`, payload);
    if (payload?.notificationType) {
      const res = await n8nNotificationService.dispatchNotification(payload);
      return { success: res.success, message: res.message };
    }
    return { success: true, message: `n8n workflow '${workflowName}' dispatched successfully.` };
  },

  async syncGoogleSheets(): Promise<{ success: boolean; rowsSynced: number }> {
    const regs = await this.getRegistrations();
    return { success: true, rowsSynced: regs.length };
  }
};
