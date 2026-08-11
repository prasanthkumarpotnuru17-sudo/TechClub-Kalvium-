import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "@/types/auth";
import { teamAccessService } from "@/services/teamAccessService";
import { canDeleteChatMessage, canPostTasks, canAccessCommunityChat } from "@/lib/permissions";

const COMMUNITY_CHAT_COLLECTION = "community_chats";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  senderAvatar?: string;
  message: string;
  type: "text" | "task";
  createdAt: any;
  updatedAt?: any;
  isDeleted?: boolean;
}

export const chatService = {
  // Real-time single subscription listener for Community Chat
  subscribeCommunityChat(
    callback: (messages: ChatMessage[]) => void,
    onError?: (error: any) => void
  ): () => void {
    const q = query(
      collection(db, COMMUNITY_CHAT_COLLECTION),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const messages: ChatMessage[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let createdAtStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === "function") {
              createdAtStr = data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (data.createdAt.seconds) {
              createdAtStr = new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (typeof data.createdAt === "string") {
              createdAtStr = new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
          }

          return {
            id: docSnap.id,
            senderId: data.senderId || "",
            senderName: data.senderName || "Community Member",
            senderEmail: data.senderEmail || "",
            senderRole: data.senderRole || "member",
            senderAvatar: data.senderAvatar || undefined,
            message: data.message || "",
            type: data.type === "task" ? "task" : "text",
            createdAt: createdAtStr,
            isDeleted: !!data.isDeleted,
          } as ChatMessage;
        });

        // Filter out deleted messages
        callback(messages.filter((m) => !m.isDeleted));
      },
      (err) => {
        console.error("[chatService] Error subscribing to community chat:", err);
        if (onError) onError(err);
        else callback([]);
      }
    );
  },

  // Send a message deriving identity strictly from authenticated user object
  async sendMessage(
    messageText: string,
    type: "text" | "task",
    user: User | null,
    userRole: string
  ): Promise<void> {
    const text = messageText.trim();
    if (!text) return;
    if (!user) throw new Error("Authentication required to send chat messages.");

    // Verify Tech Club membership
    const isMemberInDb = await teamAccessService.isTechClubMember(user.email, user.uid || user.id);
    const hasAccess = canAccessCommunityChat(userRole, isMemberInDb);
    if (!hasAccess) {
      throw new Error("Forbidden: Community Chat is available only to Tech Club members.");
    }

    // Only Super Admin can post tasks
    const messageType = type === "task" && canPostTasks(userRole) ? "task" : "text";

    await addDoc(collection(db, COMMUNITY_CHAT_COLLECTION), {
      senderId: user.uid || user.id,
      senderName: user.name || user.fullName || user.email.split("@")[0] || "Member",
      senderEmail: user.email.toLowerCase().trim(),
      senderRole: userRole,
      senderAvatar: user.avatar || null,
      message: text,
      type: messageType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDeleted: false,
    });
  },

  // Delete message with permission verification
  async deleteMessage(
    messageId: string,
    messageSenderId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<void> {
    const allowed = canDeleteChatMessage(currentUserRole, messageSenderId, currentUserId);
    if (!allowed) {
      throw new Error("Forbidden: You do not have permission to delete this message.");
    }

    try {
      await updateDoc(doc(db, COMMUNITY_CHAT_COLLECTION, messageId), {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("[chatService] Soft delete warning, trying deleteDoc:", err);
      await deleteDoc(doc(db, COMMUNITY_CHAT_COLLECTION, messageId));
    }
  }
};
