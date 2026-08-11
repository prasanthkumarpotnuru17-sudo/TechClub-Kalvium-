import { 
  collection, doc, getDocs, onSnapshot, query, limit, orderBy, deleteDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc } from "@/lib/firestoreUtils";
import { ActivityItem } from "@/lib/services/mockData";

const LOGS_COLLECTION = "activity_logs";

export interface LogItemWithTimestamp extends ActivityItem {
  createdAt?: string;
  createdAtMs?: number;
}

export async function logRoleChange(
  actor: string,
  targetName: string,
  newRole: string,
  previousRole: string
): Promise<void> {
  const now = new Date();
  const id = `act-${now.getTime()}`;
  
  let action = "";
  let target = targetName;
  if (newRole === "member") {
    action = `removed ${previousRole} access from`;
  } else {
    action = `promoted`;
    target = `${targetName} to ${newRole}`;
  }

  const logItem: LogItemWithTimestamp = {
    id,
    type: "role_change",
    user: actor,
    action,
    target,
    timestamp: now.toLocaleString(),
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
    iconType: "Shield"
  };

  try {
    await safeSetDoc(doc(db, LOGS_COLLECTION, id), logItem);
  } catch (err) {
    console.error("Error creating role change log:", err);
  }
}

export async function logActivity(
  type: string,
  user: string,
  target: string,
  userRole?: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const now = new Date();
  const id = `act-${now.getTime()}`;
  
  let action = "";
  let iconType = type;
  
  switch (type) {
    case "registration":
      action = "registered for event";
      break;
    case "user":
      action = "updated role for user";
      break;
    case "event_created":
      action = "created new event";
      break;
    case "event_completed":
      action = "published event";
      break;
    case "event_deleted":
      action = "deleted event";
      break;
    case "participant_added":
      action = "manually added participant";
      break;
    case "participant_removed":
      action = "removed participant";
      break;
    case "gallery":
      action = "uploaded gallery photo";
      break;
    case "notification":
      action = "broadcast alert";
      break;
    case "task_posted":
      action = "posted task";
      break;
    default:
      action = `performed ${type}`;
  }

  const logItem: LogItemWithTimestamp = {
    id,
    type,
    user,
    userRole,
    action,
    target,
    targetType,
    targetId,
    timestamp: now.toLocaleString(),
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
    iconType,
    metadata
  };

  try {
    await safeSetDoc(doc(db, LOGS_COLLECTION, id), logItem);
  } catch (err) {
    console.error("Error creating activity log:", err);
  }
}

export function subscribeRecentActivities(
  callback: (logs: ActivityItem[]) => void,
  maxLogs: number = 10
): () => void {
  const q = query(
    collection(db, LOGS_COLLECTION)
  );

  return onSnapshot(q, (snapshot) => {
    const rawLogs: LogItemWithTimestamp[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      rawLogs.push({
        id: docSnap.id,
        type: data.type || "activity",
        user: data.user || data.performedBy || "System",
        userRole: data.userRole || data.role,
        action: data.action || "performed action",
        target: data.target || data.targetEmail || "",
        timestamp: data.timestamp || (data.createdAt ? new Date(data.createdAt).toLocaleString() : "Recently"),
        createdAt: data.createdAt || new Date().toISOString(),
        createdAtMs: data.createdAtMs || (data.createdAt ? new Date(data.createdAt).getTime() : 0),
        iconType: data.iconType || "Activity",
        metadata: data.metadata
      });
    });

    // Sort by timestamp descending
    rawLogs.sort((a, b) => {
      const timeA = a.createdAtMs || (a.id.startsWith("act-") ? parseInt(a.id.replace("act-", ""), 10) : 0);
      const timeB = b.createdAtMs || (b.id.startsWith("act-") ? parseInt(b.id.replace("act-", ""), 10) : 0);
      return timeB - timeA;
    });

    // Deduplicate identical adjacent actions within 2 seconds
    const deduplicated: ActivityItem[] = [];
    const seen = new Set<string>();

    for (const log of rawLogs) {
      const key = `${log.user}-${log.action}-${log.target}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(log);
      }
      if (deduplicated.length >= maxLogs) break;
    }

    callback(deduplicated);
  }, (err) => {
    console.error("Error subscribing to activity logs:", err);
    callback([]);
  });
}

export async function clearAllActivityLogs(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, LOGS_COLLECTION));
    const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
    console.log("[activityLogService] Successfully cleared all activity logs.");
  } catch (err) {
    console.error("Error clearing activity logs:", err);
  }
}
