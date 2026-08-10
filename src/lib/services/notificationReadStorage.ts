export function getReadNotificationIds(userId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  const key = `tech_club_read_anns_${userId || "guest"}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNotificationAsRead(id: string, userId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  const key = `tech_club_read_anns_${userId || "guest"}`;
  const current = getReadNotificationIds(userId);
  if (!current.includes(id)) {
    const updated = [...current, id];
    try {
      localStorage.setItem(key, JSON.stringify(updated));
      window.dispatchEvent(new Event("notification_read_change"));
    } catch (e) {
      console.warn("Could not save read notification to localStorage:", e);
    }
    return updated;
  }
  return current;
}

export function markAllNotificationsAsRead(allIds: string[], userId?: string | null): string[] {
  if (typeof window === "undefined") return [];
  const key = `tech_club_read_anns_${userId || "guest"}`;
  try {
    localStorage.setItem(key, JSON.stringify(allIds));
    window.dispatchEvent(new Event("notification_read_change"));
  } catch (e) {
    console.warn("Could not save all read notifications to localStorage:", e);
  }
  return allIds;
}
