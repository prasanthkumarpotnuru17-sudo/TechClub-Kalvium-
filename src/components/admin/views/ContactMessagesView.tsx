"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Mail,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  Reply,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Shield,
  Send,
  MoreVertical,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  contactMessageService,
  ContactMessageItem,
  MessageStatus,
  MessagePriority
} from "@/services/contactMessageService";
import { cn } from "@/lib/utils";

export function ContactMessagesView() {
  const [messages, setMessages] = useState<ContactMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedPriority, setSelectedPriority] = useState<string>("All");
  const [readFilter, setReadFilter] = useState<string>("All"); // "All" | "Unread" | "Read"
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Message for Detail Modal
  const [selectedMessage, setSelectedMessage] = useState<ContactMessageItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Subscribe to Firestore Real-time Updates
  useEffect(() => {
    setLoading(true);
    const unsub = contactMessageService.subscribeMessages(
      (data) => {
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        console.error("[ContactMessagesView] Subscription error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute Unread Count
  const unreadCount = useMemo(() => {
    return messages.filter((m) => !m.isRead && m.status !== "Archived").length;
  }, [messages]);

  // Filtering & Searching & Sorting
  const filteredMessages = useMemo(() => {
    return messages
      .filter((m) => {
        // Status filter
        if (selectedStatus !== "All" && m.status !== selectedStatus) return false;
        // Priority filter
        if (selectedPriority !== "All" && m.priority !== selectedPriority) return false;
        // Read filter
        if (readFilter === "Unread" && m.isRead) return false;
        if (readFilter === "Read" && !m.isRead) return false;
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = m.fullName.toLowerCase().includes(q);
          const matchEmail = m.email.toLowerCase().includes(q);
          const matchSubject = m.subject.toLowerCase().includes(q);
          const matchMsg = m.message.toLowerCase().includes(q);
          const matchId = m.messageId.toLowerCase().includes(q);
          return matchName || matchEmail || matchSubject || matchMsg || matchId;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [messages, selectedStatus, selectedPriority, readFilter, searchQuery, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage) || 1;
  const paginatedMessages = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMessages.slice(start, start + itemsPerPage);
  }, [filteredMessages, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPriority, readFilter, sortOrder]);

  // Modal Handlers
  const handleOpenDetail = async (msg: ContactMessageItem) => {
    setSelectedMessage(msg);
    setIsDetailModalOpen(true);
    // Automatically mark as read when opened if unread
    if (!msg.isRead) {
      await contactMessageService.markAsRead(msg.id, true);
    }
  };

  const handleMarkReadToggle = async (msgId: string, currentRead: boolean) => {
    setActionLoading(true);
    await contactMessageService.markAsRead(msgId, !currentRead);
    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage((prev) => (prev ? { ...prev, isRead: !currentRead } : null));
    }
    setActionLoading(false);
  };

  const handleStatusChange = async (msgId: string, newStatus: MessageStatus) => {
    setActionLoading(true);
    await contactMessageService.updateMessage(msgId, { status: newStatus });
    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setActionLoading(false);
  };

  const handlePriorityChange = async (msgId: string, newPriority: MessagePriority) => {
    setActionLoading(true);
    await contactMessageService.updateMessage(msgId, { priority: newPriority });
    if (selectedMessage && selectedMessage.id === msgId) {
      setSelectedMessage((prev) => (prev ? { ...prev, priority: newPriority } : null));
    }
    setActionLoading(false);
  };

  const handleArchive = async (msgId: string) => {
    if (confirm("Are you sure you want to archive this message?")) {
      setActionLoading(true);
      await contactMessageService.archiveMessage(msgId);
      setIsDetailModalOpen(false);
      setSelectedMessage(null);
      setActionLoading(false);
    }
  };

  const handleDelete = async (msgId: string) => {
    if (confirm("Are you sure you want to permanently delete this message? This action cannot be undone.")) {
      setActionLoading(true);
      await contactMessageService.deleteMessage(msgId);
      setIsDetailModalOpen(false);
      setSelectedMessage(null);
      setActionLoading(false);
    }
  };

  const handleReplyMailto = (msg: ContactMessageItem) => {
    // Mark as replied & in progress
    contactMessageService.updateMessage(msg.id, { replied: true, status: "In Progress" });
    const mailtoUrl = `mailto:${encodeURIComponent(msg.email)}?subject=${encodeURIComponent(
      `Re: ${msg.subject}`
    )}&body=${encodeURIComponent(`Hi ${msg.fullName},\n\nThank you for reaching out to the Tech Club.\n\n`)}`;
    window.open(mailtoUrl, "_blank");
  };

  // Badge Style Helpers
  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case "New":
        return "bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "In Progress":
        return "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "Resolved":
        return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "Archived":
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200";
    }
  };

  const getPriorityBadge = (priority: MessagePriority) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-bold animate-pulse";
      case "High":
        return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800 font-semibold";
      case "Normal":
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      case "Low":
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
              Contact Messages & Inquiries
            </h1>
            {unreadCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-extrabold animate-pulse shadow-sm">
                {unreadCount} Unread
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">
            Real-time contact form submissions from website visitors and members.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedStatus("All");
              setSelectedPriority("All");
              setReadFilter("All");
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* 2. Search, Filters & Controls Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 md:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, subject or message..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 text-xs md:text-sm bg-slate-50/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs md:text-sm bg-slate-50/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="New">Status: New</option>
              <option value="In Progress">Status: In Progress</option>
              <option value="Resolved">Status: Resolved</option>
              <option value="Archived">Status: Archived</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-800 text-xs md:text-sm bg-slate-50/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Low">Priority: Low</option>
              <option value="Normal">Priority: Normal</option>
              <option value="High">Priority: High</option>
              <option value="Urgent">Priority: Urgent</option>
            </select>
          </div>

          {/* Read State & Sort Order */}
          <div className="flex items-center gap-2">
            <select
              value={readFilter}
              onChange={(e) => setReadFilter(e.target.value)}
              className="w-full py-2 px-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs md:text-sm bg-slate-50/50 dark:bg-slate-950/50 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">Read & Unread</option>
              <option value="Unread">Unread Only</option>
              <option value="Read">Read Only</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips & Sort Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
          <span>
            Showing <strong className="text-gray-900 dark:text-white">{filteredMessages.length}</strong> messages
          </span>

          <div className="flex items-center gap-2">
            <span className="font-medium">Sort:</span>
            <button
              onClick={() => setSortOrder("newest")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                sortOrder === "newest"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
              )}
            >
              Newest First
            </button>
            <button
              onClick={() => setSortOrder("oldest")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                sortOrder === "oldest"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300"
              )}
            >
              Oldest First
            </button>
          </div>
        </div>
      </div>

      {/* 3. Messages Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 dark:text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
            <p className="text-xs font-medium">Loading real-time contact messages...</p>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">No Contact Messages Found</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto font-medium">
              No messages match your current filters. Try adjusting the search query or reset filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200/80 dark:border-gray-800">
                <tr>
                  <th className="py-3.5 px-4 w-10">Read</th>
                  <th className="py-3.5 px-4">Sender / Name</th>
                  <th className="py-3.5 px-4">Subject & Message Preview</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedMessages.map((msg) => {
                  const dateFormatted = new Date(msg.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <tr
                      key={msg.id}
                      onClick={() => handleOpenDetail(msg)}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-850 transition-colors cursor-pointer group",
                        !msg.isRead ? "bg-purple-50/30 dark:bg-purple-950/10 font-medium" : ""
                      )}
                    >
                      {/* Unread indicator */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkReadToggle(msg.id, msg.isRead);
                          }}
                          title={msg.isRead ? "Mark as Unread" : "Mark as Read"}
                          className="p-1 rounded-md text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          {!msg.isRead ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block ring-2 ring-purple-200" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                          )}
                        </button>
                      </td>

                      {/* Name & Email */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <div className="font-bold text-gray-900 dark:text-white truncate">
                            {msg.fullName}
                          </div>
                          {msg.isRegisteredUser ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              {msg.userRole === "super_admin" ? "Super Admin" : msg.userRole === "admin" ? "Admin" : "Member"}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] rounded-md bg-gray-100 text-gray-500 border border-gray-200 shrink-0 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                              Visitor
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                          <span className="truncate">{msg.email}</span>
                        </div>
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {msg.subject || "General Inquiry"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {msg.message}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                            getStatusBadge(msg.status)
                          )}
                        >
                          {msg.status}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] border",
                            getPriorityBadge(msg.priority)
                          )}
                        >
                          {msg.priority}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[11px]">
                        {dateFormatted}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(msg)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="View Message Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReplyMailto(msg)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                            title="Reply via Email"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(msg.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors"
                            title="Archive Message"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(msg.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Delete Message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {filteredMessages.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of{" "}
              <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. PHASE 5: MESSAGE DETAILS MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedMessage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-50 dark:bg-slate-950 border-b border-gray-200/80 dark:border-gray-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-mono font-bold">
                      {selectedMessage.messageId}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                        getStatusBadge(selectedMessage.status)
                      )}
                    >
                      {selectedMessage.status}
                    </span>
                    <span
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[10px] border",
                        getPriorityBadge(selectedMessage.priority)
                      )}
                    >
                      {selectedMessage.priority} Priority
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {selectedMessage.subject || "General Inquiry"}
                  </h3>
                </div>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs md:text-sm">
                {/* Sender Info Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-gray-200/60 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                      {selectedMessage.fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-base">
                          {selectedMessage.fullName}
                        </h4>
                        {selectedMessage.isRegisteredUser ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                            {selectedMessage.userRole === "super_admin" ? "Super Admin" : selectedMessage.userRole === "admin" ? "Club Admin" : "Registered Member"}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
                            Website Visitor
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-blue-500" />
                        {selectedMessage.email}
                        {selectedMessage.userDepartment && (
                          <span className="text-gray-400 font-semibold">• {selectedMessage.userDepartment}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {new Date(selectedMessage.createdAt).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </span>
                    </div>
                    {selectedMessage.userId && (
                      <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">
                        UID: {selectedMessage.userId.slice(0, 8)}...
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Message Content</h5>
                  <div className="p-5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-gray-200/80 dark:border-gray-800 text-gray-800 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {selectedMessage.message}
                  </div>
                </div>

                {/* Status & Priority Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-gray-200/60 dark:border-gray-800">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Change Status</label>
                    <select
                      value={selectedMessage.status}
                      onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value as MessageStatus)}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1.5">Change Priority</label>
                    <select
                      value={selectedMessage.priority}
                      onChange={(e) => handlePriorityChange(selectedMessage.id, e.target.value as MessagePriority)}
                      disabled={actionLoading}
                      className="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-gray-200/80 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkReadToggle(selectedMessage.id, selectedMessage.isRead)}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 hover:bg-slate-100 text-gray-700 dark:text-gray-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {selectedMessage.isRead ? <EyeOff className="w-4 h-4 text-purple-600" /> : <Eye className="w-4 h-4 text-purple-600" />}
                    <span>{selectedMessage.isRead ? "Mark Unread" : "Mark Read"}</span>
                  </button>

                  <button
                    onClick={() => handleArchive(selectedMessage.id)}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 hover:bg-slate-100 text-amber-600 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Archive className="w-4 h-4" />
                    <span>Archive</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>

                  <button
                    onClick={() => handleReplyMailto(selectedMessage)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Reply className="w-4 h-4" />
                    <span>Reply via Email</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
