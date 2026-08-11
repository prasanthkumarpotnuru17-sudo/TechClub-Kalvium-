"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  CheckCircle2,
  Megaphone,
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { announcementService } from "@/services/announcementService";
import { AnnouncementItem } from "@/lib/services/mockData";
import { useAuth } from "@/hooks/useAuth";
import {
  getReadNotificationIds,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/services/notificationReadStorage";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationDisplayItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "Event" | "Certificate" | "Broadcast";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const userId = user?.uid || user?.id;

  const [filter, setFilter] = useState<"All" | "Unread">("All");
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirmation Modal for Mark All as Read
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  useEffect(() => {
    // Initialize read IDs from persistent per-user storage
    setReadIds(getReadNotificationIds(userId));

    // Subscribe to live announcements in Firestore
    const unsub = announcementService.subscribeAnnouncements((anns) => {
      setAnnouncements(anns);
      setLoading(false);
    });

    const handleReadChange = () => {
      setReadIds(getReadNotificationIds(userId));
    };

    window.addEventListener("notification_read_change", handleReadChange);

    return () => {
      unsub();
      window.removeEventListener("notification_read_change", handleReadChange);
    };
  }, [userId]);

  const notifications: NotificationDisplayItem[] = announcements.map((ann) => ({
    id: ann.id,
    title: ann.title,
    message: ann.message || "",
    time: ann.date
      ? new Date(ann.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently",
    read: readIds.includes(ann.id),
    type:
      ann.category === "New Event"
        ? "Event"
        : ann.category === "Certificates"
        ? "Certificate"
        : "Broadcast",
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleCardClick = (item: NotificationDisplayItem) => {
    // 1. Mark this specific item as read on click
    if (!item.read) {
      const updated = markNotificationAsRead(item.id, userId);
      setReadIds(updated);
      announcementService.incrementReadCount(item.id);
    }
    // 2. Toggle expand details
    setExpandedId((prev) => (prev === item.id ? null : item.id));
  };

  const handleMarkSingleRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!readIds.includes(id)) {
      const updated = markNotificationAsRead(id, userId);
      setReadIds(updated);
      announcementService.incrementReadCount(id);
    }
  };

  const handleConfirmMarkAll = () => {
    const unreadAnns = announcements.filter((a) => !readIds.includes(a.id));
    const allIds = announcements.map((a) => a.id);
    const updated = markAllNotificationsAsRead(allIds, userId);
    setReadIds(updated);
    setIsConfirmModalOpen(false);

    unreadAnns.forEach((ann) => {
      announcementService.incrementReadCount(ann.id);
    });
  };

  const filtered = notifications.filter((n) => filter === "All" || !n.read);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-gray-200">
        Loading live notifications and broadcasts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-950">Notifications & Broadcasts</h1>
          <p className="text-xs text-slate-500 font-medium">
            Click any unread notification to inspect details and mark it as read.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => setIsConfirmModalOpen(true)}
            className="min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl cursor-pointer shadow-xs border border-gray-200"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-gray-200 max-w-xs">
        <button
          onClick={() => setFilter("All")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            filter === "All" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("Unread")}
          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            filter === "Unread" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        /* EMPTY STATE */
        <div className="p-12 text-center rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-950">
              {filter === "Unread" ? "All Caught Up!" : "No Broadcast Notifications"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              {filter === "Unread"
                ? "You have read all your notifications. Switch to 'All' to review previous broadcasts."
                : "New announcements and registration alerts will appear here in real time."}
            </p>
          </div>
        </div>
      ) : (
        /* NOTIFICATIONS LIST */
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => handleCardClick(item)}
                className={`p-5 rounded-[22px] border transition-all cursor-pointer ${
                  !item.read
                    ? "bg-white border-blue-300 shadow-md ring-1 ring-blue-500/20 hover:border-blue-400"
                    : "bg-slate-50/70 border-gray-200/80 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Category Icon */}
                  <div
                    className={`p-3 rounded-2xl shrink-0 ${
                      !item.read
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.type === "Event" && <Calendar className="w-5 h-5" />}
                    {item.type === "Certificate" && <Award className="w-5 h-5" />}
                    {item.type === "Broadcast" && <Megaphone className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-950">{item.title}</h4>
                        
                        {/* Prominent Unread Badge */}
                        {!item.read && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                            Unread
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-medium text-slate-400">{item.time}</span>
                        {!item.read && (
                          <button
                            onClick={(e) => handleMarkSingleRead(e, item.id)}
                            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Mark this item as read"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-xs text-slate-600 font-medium leading-relaxed ${
                        !isExpanded ? "line-clamp-2" : ""
                      }`}
                    >
                      {item.message}
                    </p>

                    {/* Expand Indicator */}
                    {item.message.length > 100 && (
                      <div className="pt-1 text-[11px] font-bold text-blue-600 flex items-center gap-1">
                        {isExpanded ? (
                          <>
                            Show Less <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            Read Full Message <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MARK ALL CONFIRMATION MODAL */}
      <AnimatePresence>
        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfirmModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 space-y-4 text-slate-900"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-slate-950">Mark All as Read?</h3>
                </div>
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Are you sure you want to mark all <strong>{unreadCount} unread notifications</strong> as read? This will clear all unread badges across your dashboard.
              </p>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmMarkAll}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md cursor-pointer"
                >
                  Confirm Mark All as Read
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
