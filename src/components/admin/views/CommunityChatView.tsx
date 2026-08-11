"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  AlertCircle, 
  ShieldCheck, 
  UserCheck, 
  Crown,
  Loader2,
  Flag,
  ListTodo,
  Lock,
  Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { chatService, ChatMessage } from "@/services/chatService";
import { teamAccessService } from "@/services/teamAccessService";
import { canPostTasks, canDeleteChatMessage, canAccessCommunityChat } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export function CommunityChatView() {
  const { user, role } = useAuth();
  const userEffectiveRole = role || (user as any)?.role || "member";
  const currentUserId = user?.uid || user?.id || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isTaskType, setIsTaskType] = useState(false);

  const [isClubMember, setIsClubMember] = useState<boolean | null>(null);
  const [checkingMembership, setCheckingMembership] = useState(true);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSuperAdminUser = canPostTasks(userEffectiveRole);

  // 1. Verify Tech Club Membership first
  useEffect(() => {
    let isMounted = true;
    setCheckingMembership(true);

    async function verifyMembership() {
      if (!user) {
        if (isMounted) {
          setIsClubMember(false);
          setCheckingMembership(false);
        }
        return;
      }

      try {
        const isMemberInDb = await teamAccessService.isTechClubMember(user.email, user.uid);
        const hasAccess = canAccessCommunityChat(userEffectiveRole, isMemberInDb);
        if (isMounted) {
          setIsClubMember(hasAccess);
          setCheckingMembership(false);
        }
      } catch (err) {
        console.error("[CommunityChatView] Error checking membership:", err);
        if (isMounted) {
          setIsClubMember(canAccessCommunityChat(userEffectiveRole, false));
          setCheckingMembership(false);
        }
      }
    }

    verifyMembership();
    return () => {
      isMounted = false;
    };
  }, [user, userEffectiveRole]);

  // 2. Real-time Firestore subscription ONLY for verified Tech Club members
  useEffect(() => {
    if (!isClubMember) return;

    setLoading(true);
    setError(null);
    const unsub = chatService.subscribeCommunityChat(
      (chatLogs) => {
        setMessages(chatLogs);
        setLoading(false);
      },
      (err) => {
        console.error("[CommunityChatView] Error loading chat:", err);
        setError("Failed to load community chat. Please check connection.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [isClubMember]);

  // Auto-scroll to newest message
  useEffect(() => {
    if (isClubMember) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isClubMember]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !isClubMember) return;
    setSending(true);
    try {
      await chatService.sendMessage(
        inputText,
        isTaskType ? "task" : "text",
        user,
        userEffectiveRole
      );
      setInputText("");
      setIsTaskType(false);
    } catch (err: any) {
      alert("Failed to send message: " + (err?.message || "Error"));
    } finally {
      setSending(false);
    }
  };

  const handleReportIssue = () => {
    if (!inputText.startsWith("Issue: ")) {
      setInputText((prev) => `Issue: ${prev}`);
    }
  };

  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (confirm("Delete this message?")) {
      try {
        await chatService.deleteMessage(
          msg.id,
          msg.senderId,
          currentUserId,
          userEffectiveRole
        );
      } catch (err: any) {
        alert(err.message || "Failed to delete message.");
      }
    }
  };

  const renderRoleBadge = (msgRole: string) => {
    const r = (msgRole || "").toLowerCase();
    if (r === "super_admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Crown className="w-3 h-3" /> Super Admin
        </span>
      );
    }
    if (r === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    }
    if (r === "coordinator") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
          <UserCheck className="w-3 h-3" /> Coordinator
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        Member
      </span>
    );
  };

  // ── 1. Checking Membership Loading State ────────────────────────────────
  if (checkingMembership) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center rounded-3xl glass-card border border-gray-200/60 dark:border-gray-800/60 p-8 text-blue-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs font-semibold">Verifying Tech Club Membership...</span>
      </div>
    );
  }

  // ── 2. Non-Tech-Club Member Access Restricted Screen ────────────────────
  if (!isClubMember) {
    return (
      <div className="flex flex-col h-[calc(100vh-8rem)] items-center justify-center rounded-3xl glass-card border border-gray-200/60 dark:border-gray-800/60 p-8 text-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4 ring-8 ring-amber-500/5">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white mb-2">
          Tech Club Community
        </h2>
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 max-w-md mb-3">
          Community Chat is available only to Tech Club members.
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md leading-relaxed mb-6">
          Connect with Tech Club members, coordinators, admins, and Super Admins. If you are an official Tech Club member or coordinator, please sign in with your registered club account.
        </p>
        <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 max-w-sm text-xs text-blue-700 dark:text-blue-300">
          <p className="font-bold mb-1 flex items-center justify-center gap-1.5">
            <Users className="w-4 h-4" /> Want to Join Tech Club?
          </p>
          <p className="text-[11px] opacity-90">
            Contact your department coordinator or submit an application through the main Tech Club portal.
          </p>
        </div>
      </div>
    );
  }

  // ── 3. Tech Club Member Full Chat Interface ──────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] rounded-3xl glass-card border border-gray-200/60 dark:border-gray-800/60 overflow-hidden shadow-xl">
      {/* Group Header */}
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Tech Club Community
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Group
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Connect with Tech Club members, coordinators, admins, and Super Admins.
            </p>
          </div>
        </div>

        <button
          onClick={handleReportIssue}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded-xl border border-amber-500/30 transition-colors cursor-pointer"
        >
          <Flag className="w-3.5 h-3.5" />
          Report an Issue
        </button>
      </div>

      {/* Messages Scroll Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50/50 dark:bg-slate-950/30">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-blue-500 gap-2">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xs font-medium">Connecting to Tech Club Community...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center text-xs space-y-1 my-auto">
            <AlertCircle className="w-5 h-5 mx-auto" />
            <p className="font-bold">{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8 space-y-3">
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-500">
              <MessageSquare className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No messages in Tech Club Community yet.</p>
            <p className="text-xs text-gray-400 max-w-sm">
              Be the first to say hello, ask a question, or post an official announcement!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSelf = msg.senderId === currentUserId;
            const isTask = msg.type === "task";
            const canDelete = canDeleteChatMessage(userEffectiveRole, msg.senderId, currentUserId);

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3 max-w-2xl group",
                  isSelf ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <img
                  src={
                    msg.senderAvatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderEmail || msg.senderId}`
                  }
                  alt=""
                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-blue-500/20"
                />

                <div className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {msg.senderName}
                    </span>
                    {renderRoleBadge(msg.senderRole)}
                    <span className="text-[10px] text-gray-400">{msg.createdAt}</span>
                  </div>

                  <div
                    className={cn(
                      "relative rounded-2xl p-3 md:p-4 text-xs md:text-sm shadow-sm transition-all",
                      isTask
                        ? "bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border-2 border-amber-500/40 text-gray-900 dark:text-gray-100"
                        : isSelf
                        ? "bg-blue-600 text-white rounded-tr-none"
                        : "bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none"
                    )}
                  >
                    {isTask && (
                      <div className="flex items-center gap-1.5 font-extrabold text-[11px] text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider">
                        <ListTodo className="w-4 h-4 text-amber-500" />
                        <span>[ OFFICIAL TASK ]</span>
                      </div>
                    )}

                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteMessage(msg)}
                        className="opacity-0 group-hover:opacity-100 absolute -top-2 -right-2 p-1 bg-red-100 dark:bg-red-950 text-red-600 rounded-full shadow border border-red-200 dark:border-red-800 transition-opacity cursor-pointer"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Text Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
        {isSuperAdminUser && (
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setIsTaskType(!isTaskType)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border",
                isTaskType
                  ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
              )}
            >
              <ListTodo className="w-3.5 h-3.5" />
              {isTaskType ? "Posting as TASK" : "Mark as TASK"}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isTaskType ? "Enter official task instruction..." : "Type a message to Tech Club Community..."}
            className="flex-1 px-4 py-3 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className={cn(
              "px-5 py-3 rounded-2xl font-bold text-xs md:text-sm flex items-center gap-2 text-white shadow-md transition-all cursor-pointer shrink-0",
              inputText.trim() && !sending
                ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
                : "bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-60"
            )}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
