import React, { useState, useEffect } from "react";
import { Bell, Send, Search, Users, ShieldAlert, Sparkles, CheckCircle, Trash2 } from "lucide-react";
import { AnnouncementItem } from "@/lib/services/mockData";
import { announcementService } from "@/services/announcementService";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface NotificationsViewProps {
  onOpenCreateModal: () => void;
}

export function NotificationsView({ onOpenCreateModal }: NotificationsViewProps) {
  const [notifications, setNotifications] = useState<AnnouncementItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = announcementService.subscribeAnnouncements((anns) => {
      setNotifications(anns);
    });
    return () => unsub();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this announcement?")) {
      await announcementService.deleteAnnouncement(id);
    }
  };

  const filteredNotifs = notifications.filter(
    (n) =>
      (n.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.message ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.category ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Announcements & Broadcast Alerts
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Broadcast targeted push alerts, email updates, and WhatsApp event reminders.
          </p>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
          New Announcement
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter announcements by title, type or content..."
          className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
        />
      </div>

      {/* Broadcast History List */}
      <div className="space-y-4">
        {filteredNotifs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
            No announcements found. Add one above!
          </div>
        ) : (
          filteredNotifs.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full border",
                      n.category === "New Event"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        : n.category === "Important" || n.isImportant
                        ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    )}
                  >
                    {n.category}
                  </span>

                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-500" />
                    Target: <strong className="text-gray-700 dark:text-gray-300">{n.targetAudience}</strong>
                  </span>

                  <span className="text-[10px] text-gray-400 ml-auto md:ml-0">{n.date}</span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white text-base">{n.title}</h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{n.message}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {n.readCount || 0} Reads
                  </span>
                  <p className="text-[10px] text-gray-400">By Club Admin</p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
