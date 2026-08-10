import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { removeUndefinedFields, safeSetDoc } from "@/lib/firestoreUtils";

export type MessageStatus = "New" | "In Progress" | "Resolved" | "Archived";
export type MessagePriority = "Low" | "Normal" | "High" | "Urgent";

export interface ContactMessageItem {
  id: string;
  messageId: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  status: MessageStatus;
  priority: MessagePriority;
  isRead: boolean;
  replied: boolean;
  assignedTo: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  // User profile details
  userRole?: string | null;
  userDepartment?: string | null;
  isRegisteredUser?: boolean;
  userAvatar?: string | null;
}

const COLLECTION_NAME = "contact_messages";

export const contactMessageService = {
  /**
   * Fetches all contact messages from the API endpoint (/api/contact)
   * which enriches messages with registered user profile details.
   */
  async getMessages(): Promise<ContactMessageItem[]> {
    try {
      const res = await fetch("/api/contact", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as ContactMessageItem[];
        }
      }
    } catch (err) {
      console.warn("[contactMessageService] API fetch error:", err);
    }
    // Fallback: try Client SDK getDocs
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          messageId: data.messageId || docSnap.id,
          fullName: data.fullName || "Anonymous",
          email: data.email || "",
          subject: data.subject || "General Inquiry",
          message: data.message || "",
          status: (data.status as MessageStatus) || "New",
          priority: (data.priority as MessagePriority) || "Normal",
          isRead: data.isRead ?? false,
          replied: data.replied ?? false,
          assignedTo: data.assignedTo || null,
          userId: data.userId || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          userRole: data.userRole || null,
          userDepartment: data.userDepartment || null,
          isRegisteredUser: Boolean(data.isRegisteredUser),
          userAvatar: data.userAvatar || null,
        };
      });
    } catch (clientErr) {
      console.warn("[contactMessageService] Client SDK getDocs error:", clientErr);
      return [];
    }
  },

  /**
   * Creates a new contact message document in Firestore.
   */
  async createMessage(input: {
    fullName: string;
    email: string;
    subject?: string;
    message: string;
    userId?: string | null;
  }): Promise<ContactMessageItem> {
    const nowIso = new Date().toISOString();
    const formattedSubject = (input.subject || "").trim() || "General Inquiry";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedMessageId = `MSG-${new Date().getFullYear()}-${randomSuffix}`;
    const generatedDocId = `msg_${Date.now()}_${randomSuffix}`;

    const rawPayload = {
      messageId: generatedMessageId,
      fullName: input.fullName.trim(),
      email: input.email.trim().toLowerCase(),
      subject: formattedSubject,
      message: input.message.trim(),
      status: "New" as MessageStatus,
      priority: "Normal" as MessagePriority,
      isRead: false,
      replied: false,
      assignedTo: null,
      userId: input.userId || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cleanPayload = removeUndefinedFields(rawPayload);
    let createdItem: ContactMessageItem | null = null;

    // 1. Try Browser Client SDK write
    try {
      await safeSetDoc(doc(db, COLLECTION_NAME, generatedDocId), cleanPayload);
      createdItem = {
        id: generatedDocId,
        ...cleanPayload,
      } as ContactMessageItem;
    } catch (clientErr: any) {
      console.warn("[contactMessageService] Client write notice (falling back to API):", clientErr?.message || clientErr);
    }

    // 2. POST to /api/contact to ensure Admin SDK receives it and enriches user details
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const apiData = await res.json();
      if (res.ok && apiData.success && apiData.data) {
        createdItem = apiData.data as ContactMessageItem;
      }
    } catch (apiErr: any) {
      console.warn("[contactMessageService] API POST error:", apiErr);
    }

    if (!createdItem) {
      createdItem = {
        id: generatedDocId,
        ...cleanPayload,
      } as ContactMessageItem;
    }

    // 3. Trigger non-blocking notification dispatch to Super Admin
    try {
      const { notificationService } = await import("@/services/notificationService");
      notificationService.sendContactMessageNotification(createdItem).catch((err) => {
        console.warn("[contactMessageService] Non-blocking notification error:", err);
      });
    } catch (err) {
      console.warn("[contactMessageService] Notification trigger warning:", err);
    }

    return createdItem;
  },

  /**
   * Real-time subscription to all contact messages, combining onSnapshot with API polling fallback.
   */
  subscribeMessages(
    callback: (messages: ContactMessageItem[]) => void,
    onError?: (error: any) => void
  ): () => void {
    let currentMap = new Map<string, ContactMessageItem>();

    const notifyCombined = (items: ContactMessageItem[]) => {
      items.forEach((item) => {
        const existing = currentMap.get(item.id);
        currentMap.set(item.id, {
          ...existing,
          ...item,
          // Preserve enriched user details if snapshot payload is basic
          isRegisteredUser: item.isRegisteredUser ?? existing?.isRegisteredUser,
          userRole: item.userRole ?? existing?.userRole,
          userDepartment: item.userDepartment ?? existing?.userDepartment,
          userAvatar: item.userAvatar ?? existing?.userAvatar,
        });
      });

      const sorted = Array.from(currentMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(sorted);
    };

    // Initial API fetch
    this.getMessages().then((apiItems) => {
      if (apiItems.length > 0) {
        notifyCombined(apiItems);
      }
    });

    // Firestore Snapshot Listener
    let unsubSnapshot: (() => void) | null = null;
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
      unsubSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const snapshotItems: ContactMessageItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              messageId: data.messageId || docSnap.id,
              fullName: data.fullName || "Anonymous",
              email: data.email || "",
              subject: data.subject || "General Inquiry",
              message: data.message || "",
              status: (data.status as MessageStatus) || "New",
              priority: (data.priority as MessagePriority) || "Normal",
              isRead: data.isRead ?? false,
              replied: data.replied ?? false,
              assignedTo: data.assignedTo || null,
              userId: data.userId || null,
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
              userRole: data.userRole || null,
              userDepartment: data.userDepartment || null,
              isRegisteredUser: Boolean(data.isRegisteredUser),
              userAvatar: data.userAvatar || null,
            };
          });
          notifyCombined(snapshotItems);
        },
        (error) => {
          console.warn("[contactMessageService] Snapshot notice:", error?.message || error);
          if (onError) onError(error);
        }
      );
    } catch (err: any) {
      console.warn("[contactMessageService] Snapshot exception:", err?.message || err);
    }

    // Periodic API Polling Fallback (every 4 seconds)
    const pollInterval = setInterval(async () => {
      const freshApiItems = await this.getMessages();
      if (freshApiItems.length > 0) {
        notifyCombined(freshApiItems);
      }
    }, 4000);

    return () => {
      if (unsubSnapshot) unsubSnapshot();
      clearInterval(pollInterval);
    };
  },

  async getMessage(id: string): Promise<ContactMessageItem | null> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          messageId: data.messageId || docSnap.id,
          fullName: data.fullName || "Anonymous",
          email: data.email || "",
          subject: data.subject || "General Inquiry",
          message: data.message || "",
          status: (data.status as MessageStatus) || "New",
          priority: (data.priority as MessagePriority) || "Normal",
          isRead: data.isRead ?? false,
          replied: data.replied ?? false,
          assignedTo: data.assignedTo || null,
          userId: data.userId || null,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn("[contactMessageService] getMessage client error:", err);
    }

    const all = await this.getMessages();
    return all.find((m) => m.id === id || m.messageId === id) || null;
  },

  async updateMessage(id: string, updates: Partial<ContactMessageItem>): Promise<void> {
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    try {
      await fetch("/api/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, updates: cleanUpdates }),
      });
    } catch (err) {
      console.warn("[contactMessageService] API PUT error:", err);
    }

    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), cleanUpdates);
    } catch (err: any) {
      console.warn("[contactMessageService] Client updateDoc notice:", err?.message || err);
    }
  },

  async markAsRead(id: string, isRead: boolean = true): Promise<void> {
    await this.updateMessage(id, { isRead });
  },

  async archiveMessage(id: string): Promise<void> {
    await this.updateMessage(id, { status: "Archived", isRead: true });
  },

  async deleteMessage(id: string): Promise<void> {
    try {
      await fetch(`/api/contact?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("[contactMessageService] API DELETE error:", err);
    }

    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (err: any) {
      console.warn("[contactMessageService] Client deleteDoc notice:", err?.message || err);
    }
  },
};
