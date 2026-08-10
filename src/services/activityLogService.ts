import { 
  collection, doc, getDocs, onSnapshot, query, limit, orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc } from "@/lib/firestoreUtils";
import { ActivityItem } from "@/lib/services/mockData";

const LOGS_COLLECTION = "activity_logs";

export async function logRoleChange(
  actor: string,
  targetName: string,
  newRole: string,
  previousRole: string
): Promise<void> {
  const id = `act-${Date.now()}`;
  
  let action = "";
  let target = targetName;
  if (newRole === "member") {
    action = `removed ${previousRole} access from`;
  } else {
    action = `promoted`;
    target = `${targetName} to ${newRole}`;
  }

  const logItem: ActivityItem = {
    id,
    type: "role_change",
    user: actor,
    action,
    target,
    timestamp: new Date().toLocaleString(),
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
  const id = `act-${Date.now()}`;
  
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
    default:
      action = `performed ${type}`;
  }

  const logItem: ActivityItem = {
    id,
    type,
    user,
    userRole,
    action,
    target,
    targetType,
    targetId,
    timestamp: new Date().toLocaleString(),
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
    collection(db, LOGS_COLLECTION),
    orderBy("id", "desc"),
    limit(maxLogs)
  );

  return onSnapshot(q, (snapshot) => {
    const logs: ActivityItem[] = [];
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as ActivityItem);
    });
    callback(logs);
  }, (err) => {
    console.error("Error subscribing to activity logs:", err);
    callback([]);
  });
}
