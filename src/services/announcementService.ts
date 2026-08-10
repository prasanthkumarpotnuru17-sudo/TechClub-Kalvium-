import { 
  collection, doc, getDocs, getDoc, deleteDoc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { AnnouncementItem } from "@/lib/services/mockData";
import { logActivity } from "./activityLogService";
import { notificationService } from "./notificationService";

const ANNOUNCEMENTS_COLLECTION = "announcements";

export const announcementService = {
  subscribeAnnouncements(callback: (anns: AnnouncementItem[]) => void): () => void {
    // Sort pinned/important ones first, then descending by date or id
    const q = query(
      collection(db, ANNOUNCEMENTS_COLLECTION),
      orderBy("id", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const anns: AnnouncementItem[] = [];
      snapshot.forEach((docSnap) => {
        anns.push({ id: docSnap.id, ...docSnap.data() } as AnnouncementItem);
      });
      // Sort pinned announcements to top
      anns.sort((a, b) => (b.isImportant ? 1 : 0) - (a.isImportant ? 1 : 0));
      callback(anns);
    }, (error) => {
      console.error("Error subscribing to announcements:", error);
      callback([]);
    });
  },

  async createAnnouncement(
    annData: Omit<AnnouncementItem, "id" | "date" | "readCount">
  ): Promise<AnnouncementItem> {
    const id = `ann-${Date.now()}`;
    const newAnn: AnnouncementItem = {
      ...annData,
      id,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      readCount: 0,
      isImportant: !!annData.isImportant
    };
    await safeSetDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id), newAnn);
    await logActivity("notification", "System Admin", newAnn.title);

    // Trigger n8n notification service non-blockingly upon announcement creation
    notificationService.sendAnnouncement(newAnn).catch((err) => {
      console.error("[AnnouncementService] Error triggering notification webhook:", err);
    });

    return newAnn;
  },

  async updateAnnouncement(id: string, updates: Partial<AnnouncementItem>): Promise<void> {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await safeUpdateDoc(docRef, updates);
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const docRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    const title = snap.exists() ? (snap.data() as AnnouncementItem).title : id;
    await deleteDoc(docRef);
    await logActivity("notification", "System Admin", `Deleted Announcement: ${title}`);
  }
};
