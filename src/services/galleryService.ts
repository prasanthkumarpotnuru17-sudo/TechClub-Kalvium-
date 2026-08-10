import { 
  collection, doc, getDocs, getDoc, deleteDoc, onSnapshot, query, orderBy 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { GalleryItem, GalleryPhotoItem } from "@/lib/services/mockData";
import { logActivity } from "./activityLogService";

const GALLERY_COLLECTION = "gallery";

export const galleryService = {
  // Real-time listener for gallery items
  subscribeGallery(callback: (items: (GalleryItem & GalleryPhotoItem)[]) => void): () => void {
    const q = query(collection(db, GALLERY_COLLECTION), orderBy("id", "desc"));
    return onSnapshot(q, (snapshot) => {
      const items: (GalleryItem & GalleryPhotoItem)[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const url = data.imageUrl || data.src || "";
        items.push({
          id: docSnap.id,
          title: data.title || "",
          imageUrl: url,
          src: url,
          category: data.category || "Workshops",
          eventDate: data.eventDate || data.date || "TBD",
          date: data.eventDate || data.date || "TBD",
          likes: data.likes || 0,
          description: data.description || data.title || "",
          event: data.event || data.title || "",
          photographer: data.photographer || "Tech Club",
          heightClass: data.heightClass || "h-60",
          ...data
        } as (GalleryItem & GalleryPhotoItem));
      });
      callback(items);
    }, (error) => {
      console.error("Error subscribing to gallery:", error);
      callback([]);
    });
  },

  // Retrieve gallery items once
  async getGallery(): Promise<(GalleryItem & GalleryPhotoItem)[]> {
    const snap = await getDocs(collection(db, GALLERY_COLLECTION));
    const items: (GalleryItem & GalleryPhotoItem)[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const url = data.imageUrl || data.src || "";
      items.push({
        id: docSnap.id,
        title: data.title || "",
        imageUrl: url,
        src: url,
        category: data.category || "Workshops",
        eventDate: data.eventDate || data.date || "TBD",
        date: data.eventDate || data.date || "TBD",
        likes: data.likes || 0,
        description: data.description || data.title || "",
        event: data.event || data.title || "",
        photographer: data.photographer || "Tech Club",
        heightClass: data.heightClass || "h-60",
        ...data
      } as (GalleryItem & GalleryPhotoItem));
    });
    return items;
  },

  // Upload an image file to Firebase Storage
  async uploadImageFile(file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `gallery/${fileName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  },

  // Add gallery item metadata
  async addGalleryImage(itemData: {
    title: string;
    imageUrl: string;
    category: string;
    eventDate: string;
    description?: string;
    photographer?: string;
  }): Promise<GalleryItem> {
    const id = `gal-${Date.now()}`;
    const newItem: GalleryItem & { src: string } = {
      id,
      title: itemData.title,
      imageUrl: itemData.imageUrl,
      src: itemData.imageUrl,
      category: itemData.category as any,
      eventDate: itemData.eventDate,
      likes: 0,
    };
    await safeSetDoc(doc(db, GALLERY_COLLECTION, id), newItem);
    await logActivity("gallery", "System Admin", itemData.title);
    return newItem;
  },

  // Delete a gallery item
  async deleteGalleryImage(id: string): Promise<void> {
    const docRef = doc(db, GALLERY_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const title = data.title || id;
      await deleteDoc(docRef);
      await logActivity("gallery", "System Admin", `Deleted Photo: ${title}`);
      
      // Attempt to delete from Firebase Storage if it's a storage URL
      const imageUrl = data.imageUrl || "";
      if (imageUrl.includes("firebasestorage.googleapis.com")) {
        try {
          const storageRef = ref(storage, imageUrl);
          await deleteObject(storageRef);
        } catch (e) {
          console.warn("Could not delete associated storage file:", e);
        }
      }
    }
  },

  // Like a gallery item
  async likeGalleryImage(id: string, currentLikes: number): Promise<void> {
    const docRef = doc(db, GALLERY_COLLECTION, id);
    await safeUpdateDoc(docRef, { likes: currentLikes + 1 });
  }
};
