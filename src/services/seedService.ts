import { collection, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc } from "@/lib/firestoreUtils";
import { 
  mockEvents, 
  mockAnnouncements, 
  mockGallery, 
  mockTeam 
} from "@/lib/services/mockData";

export const seedService = {
  async seedAllData(onProgress?: (msg: string) => void): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Seed Events
      onProgress?.("Checking events...");
      const eventsSnap = await getDocs(collection(db, "events"));
      if (eventsSnap.empty) {
        onProgress?.("Seeding events...");
        for (const evt of mockEvents) {
          await safeSetDoc(doc(db, "events", evt.id), {
            ...evt,
            registeredCount: evt.registeredCount || 0
          });
        }
      }

      // 2. Seed Announcements
      onProgress?.("Checking announcements...");
      const annSnap = await getDocs(collection(db, "announcements"));
      if (annSnap.empty) {
        onProgress?.("Seeding announcements...");
        for (const ann of mockAnnouncements) {
          await safeSetDoc(doc(db, "announcements", ann.id), ann);
        }
      }

      // 3. Seed Gallery
      onProgress?.("Checking gallery...");
      const gallerySnap = await getDocs(collection(db, "gallery"));
      if (gallerySnap.empty) {
        onProgress?.("Seeding gallery...");
        for (const photo of mockGallery) {
          await safeSetDoc(doc(db, "gallery", photo.id), {
            ...photo,
            likes: photo.likes || 0
          });
        }
      }

      // 4. Seed Team Members
      onProgress?.("Checking team members...");
      const teamSnap = await getDocs(collection(db, "teams"));
      if (teamSnap.empty) {
        onProgress?.("Seeding team members...");
        for (const tm of mockTeam) {
          await safeSetDoc(doc(db, "teams", tm.id), tm);
        }
      }

      return { success: true, message: "Baseline collections seeded successfully." };
    } catch (error: any) {
      console.error("Seeding failed:", error);
      return { success: false, message: error?.message || "Seeding failed" };
    }
  }
};
