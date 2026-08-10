import { EventItem } from "@/lib/services/mockData";

export interface RegistrationOpenCheckResult {
  isOpen: boolean;
  reason?: string;
  badgeText?: string;
}

/**
 * Validates whether registrations can be accepted for a given event.
 */
export function isRegistrationOpen(event: EventItem | null | undefined): RegistrationOpenCheckResult {
  if (!event) {
    return { isOpen: false, reason: "Event details not found.", badgeText: "Closed" };
  }

  const statusLower = (event.status || "published").toLowerCase();

  // 1. Status checks
  if (statusLower === "upcoming") {
    return { 
      isOpen: false, 
      reason: "This event is scheduled as Upcoming. Registrations will open once published by an Admin.", 
      badgeText: "Opening Soon" 
    };
  }

  if (statusLower === "closed") {
    return { 
      isOpen: false, 
      reason: "Registrations for this event are currently closed by the organizer.", 
      badgeText: "Registrations Closed" 
    };
  }

  if (statusLower === "cancelled") {
    return { 
      isOpen: false, 
      reason: "This event has been cancelled.", 
      badgeText: "Cancelled" 
    };
  }

  if (statusLower === "draft") {
    return { 
      isOpen: false, 
      reason: "This event is currently in draft mode and not accepting registrations.", 
      badgeText: "Draft / Not Open" 
    };
  }

  if (statusLower === "archived" || statusLower === "completed") {
    return { 
      isOpen: false, 
      reason: "This event is no longer accepting new registrations.", 
      badgeText: "Ended" 
    };
  }

  // 2. Capacity check
  const registered = event.registeredCount ?? 0;
  const capacity = event.capacity ?? 0;
  if (capacity > 0 && registered >= capacity) {
    return { 
      isOpen: false, 
      reason: "This event has reached maximum seating capacity.", 
      badgeText: "Sold Out" 
    };
  }

  // 3. Published Event => Registration is OPEN!
  return { isOpen: true, badgeText: "Register Now" };
}
