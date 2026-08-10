import { 
  collection, doc, getDocs, getDoc, deleteDoc, onSnapshot, query, where 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { EventItem } from "@/lib/services/mockData";
import { logActivity } from "./activityLogService";
import { notificationService } from "@/services/notificationService";

const EVENTS_COLLECTION = "events";

export const eventService = {
  // Real-time listener for all events (Admin & General view)
  subscribeAllEvents(callback: (events: EventItem[]) => void, onError?: (error: any) => void): () => void {
    this.getEvents().then((evs) => {
      if (evs.length > 0) callback(evs);
    }).catch(() => {});

    const q = query(collection(db, EVENTS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const events: EventItem[] = [];
      snapshot.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() } as EventItem);
      });
      callback(events);
    }, async (error) => {
      console.warn("[eventService] Client snapshot notice (using API fallback):", error?.message || error);
      const fallbackEvents = await this.getEvents();
      callback(fallbackEvents);
      if (onError && fallbackEvents.length === 0) onError(error);
    });
  },

  // Real-time listener for published events only (Landing page & Student portal)
  subscribePublishedEvents(callback: (events: EventItem[]) => void, onError?: (error: any) => void): () => void {
    return this.subscribeAllEvents((allEvents) => {
      const published = allEvents.filter(
        (e) => e.status === "Published" || e.status === "Upcoming" || !e.status || (e.status as string) === "published" || (e.status as string) === "upcoming"
      );
      callback(published);
    }, onError);
  },

  // One-time query of all events (with API fallback)
  async getEvents(): Promise<EventItem[]> {
    try {
      const res = await fetch("/api/events", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data as EventItem[];
        }
      }
    } catch (apiErr) {
      console.warn("[eventService] API fetch error:", apiErr);
    }

    try {
      const snap = await getDocs(collection(db, EVENTS_COLLECTION));
      const events: EventItem[] = [];
      snap.forEach((docSnap) => {
        events.push({ id: docSnap.id, ...docSnap.data() } as EventItem);
      });
      return events;
    } catch (clientErr) {
      console.warn("[eventService] Client getDocs notice:", clientErr);
      return [];
    }
  },

  // Create a new event
  async createEvent(eventData: Omit<EventItem, "id" | "registeredCount">): Promise<EventItem> {
    const id = `evt-${Date.now()}`;
    const newEvent: EventItem = {
      ...eventData,
      id,
      registeredCount: 0,
    };
    await safeSetDoc(doc(db, EVENTS_COLLECTION, id), newEvent);
    await logActivity("event_created", "System Admin", newEvent.title);
    return newEvent;
  },

  // Update an event
  async updateEvent(id: string, updates: Partial<EventItem>): Promise<void> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await safeUpdateDoc(docRef, updates);
    
    // Log publishing action if status changed
    if (updates.status) {
      await logActivity(
        updates.status === "Published" ? "event_completed" : "event_created", 
        "System Admin", 
        updates.title || id
      );
    }
  },

  // Delete an event (API with client fallback)
  async deleteEvent(id: string): Promise<void> {
    const { auth } = await import("@/lib/firebase");
    const token = await auth.currentUser?.getIdToken();
    
    try {
      if (token) {
        const res = await fetch(`/api/admin/events/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return;
          }
        }
      }
    } catch (e) {
      console.warn("API route unavailable, executing client fallback:", e);
    }

    // Client-side fallback if Admin SDK API is unconfigured in local dev
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    const title = snap.exists() ? (snap.data() as EventItem).title : id;
    await deleteDoc(docRef);
    await logActivity("event_created", "System Admin", `Deleted Event: ${title}`);
  },

  // Duplicate an event
  async duplicateEvent(id: string): Promise<EventItem> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error("Event to duplicate not found in Firestore");
    }
    const target = snap.data() as EventItem;
    
    const newId = `evt-${Date.now()}`;
    const duplicate: EventItem = {
      ...target,
      id: newId,
      title: `${target.title} (Copy)`,
      status: "Draft",
      registeredCount: 0,
    };
    
    await safeSetDoc(doc(db, EVENTS_COLLECTION, newId), duplicate);
    await logActivity("event_created", "System Admin", duplicate.title);
    return duplicate;
  },

  // Cancel an event (locks status via registrationClosed: true, preserves analytics metadata & dispatches emails)
  async cancelEvent(
    id: string, 
    reason: string, 
    cancelledBy: string = "System Admin", 
    force: boolean = false,
    clientRegsOverride?: any[]
  ): Promise<any> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    const title = snap.exists() ? (snap.data() as EventItem).title : id;
    const nowIso = new Date().toISOString();

    // 1. Update Event Document to Cancelled and lock registrations (registeredCount and capacity remain intact!)
    await safeUpdateDoc(docRef, {
      status: "Cancelled",
      registrationClosed: true,
      cancellationReason: reason,
      cancelledBy,
      cancelledAt: nowIso,
      updatedAt: nowIso
    });

    await logActivity("event_created", cancelledBy, `Cancelled Event: ${title}`);

    // 2. Dispatch Cancellation Notifications
    try {
      return await notificationService.sendEventCancellationEmail(id, reason, cancelledBy, force, clientRegsOverride);
    } catch (notifErr) {
      console.warn("[eventService] Error dispatching event cancellation notifications:", notifErr);
      return { success: false, error: notifErr };
    }
  },

  // Reschedule an event (updates date/time/venue, preserves registeredCount & dispatches emails)
  async rescheduleEvent(
    id: string,
    newDate: string,
    newTime: string,
    newVenue?: string,
    reason?: string,
    rescheduledBy: string = "System Admin",
    clientRegsOverride?: any[]
  ): Promise<any> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Event not found");
    const existing = snap.data() as EventItem;
    const nowIso = new Date().toISOString();

    const oldDate = existing.date || "TBA";
    const oldTime = existing.time || "TBA";
    const updatedVenue = newVenue?.trim() || existing.venue || "Tech Club Main Auditorium";
    const rescheduleReason = reason?.trim() || "Event rescheduled due to schedule updates.";

    // Update Event Document with new schedule details
    await safeUpdateDoc(docRef, {
      date: newDate,
      time: newTime,
      venue: updatedVenue,
      oldDate,
      oldTime,
      isRescheduled: true,
      rescheduledReason: rescheduleReason,
      rescheduledBy,
      rescheduledAt: nowIso,
      updatedAt: nowIso
    });

    await logActivity("event_created", rescheduledBy, `Rescheduled Event: ${existing.title} to ${newDate} at ${newTime}`);

    // Dispatch Reschedule Notifications
    try {
      return await notificationService.sendEventRescheduledEmail(
        id,
        newDate,
        newTime,
        updatedVenue,
        rescheduleReason,
        rescheduledBy,
        clientRegsOverride
      );
    } catch (notifErr) {
      console.warn("[eventService] Error dispatching reschedule notifications:", notifErr);
      return { success: false, error: notifErr };
    }
  },

  // Retry cancellation notifications strictly for participants whose previous email failed
  async retryFailedCancellationNotifications(id: string): Promise<any> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Event not found");
    const ev = snap.data();

    return await notificationService.sendEventCancellationEmail(
      id,
      ev.cancellationReason || "Event cancellation notice",
      ev.cancelledBy || "Admin",
      false,
      undefined,
      true // retryFailedOnly === true
    );
  },

  // Restore a cancelled event (sets status back to Published and unlocks registrationClosed)
  async restoreEvent(id: string, restoredBy: string = "System Admin"): Promise<void> {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    const title = snap.exists() ? (snap.data() as EventItem).title : id;
    const nowIso = new Date().toISOString();

    await safeUpdateDoc(docRef, {
      status: "Published",
      registrationClosed: false,
      restoredAt: nowIso,
      restoredBy,
      updatedAt: nowIso
    });

    await logActivity("event_created", restoredBy, `Restored Cancelled Event: ${title}`);
  }
};
