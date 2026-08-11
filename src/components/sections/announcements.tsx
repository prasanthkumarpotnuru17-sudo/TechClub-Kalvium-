"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Megaphone, Bell, Calendar, Eye, Sparkles, ChevronRight, CheckCircle2, Pin, X } from "lucide-react";
import { AnnouncementItem } from "@/lib/services/mockData";
import { announcementService } from "@/services/announcementService";
import { getReadNotificationIds, markNotificationAsRead } from "@/lib/services/notificationReadStorage";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnnouncementsSectionProps {
  limit?: number;
  showViewAllButton?: boolean;
}

export function AnnouncementsSection({ limit, showViewAllButton = false }: AnnouncementsSectionProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeAnnouncement, setActiveAnnouncement] = useState<AnnouncementItem | null>(null);

  useEffect(() => {
    const unsub = announcementService.subscribeAnnouncements((anns) => {
      setAnnouncements(anns);
    });
    return () => unsub();
  }, []);

  const handleSelectAnnouncement = (ann: AnnouncementItem) => {
    setActiveAnnouncement(ann);
    const readIds = getReadNotificationIds();
    if (!readIds.includes(ann.id)) {
      markNotificationAsRead(ann.id);
      announcementService.incrementReadCount(ann.id);
    }
  };

  const categories = ["All", "New Event", "Certificates", "Recruitment", "General"];

  const filteredAnnouncements = announcements.filter(
    (a) => selectedCategory === "All" || a.category === selectedCategory
  );

  const displayedAnnouncements = limit && limit > 0
    ? filteredAnnouncements.slice(0, limit)
    : filteredAnnouncements;

  return (
    <section id="announcements" className="py-20 relative overflow-hidden bg-slate-50/70 text-slate-900 border-y border-slate-200/60">
      {/* Soft light background subtle glow circles */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Title Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3 shadow-xs">
            <Megaphone className="w-4 h-4 text-blue-600" />
            <span>Club Broadcast Network</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold font-display tracking-tight text-slate-950">
            Official Club <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Announcements</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Stay updated with live broadcasts, event registrations, certificate dispatches, and recruitment drives issued directly from the Tech Club Admin Dashboard.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                selectedCategory === cat
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300 shadow-xs"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Announcements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedAnnouncements.map((ann, idx) => (
            <motion.div
              key={ann.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => handleSelectAnnouncement(ann)}
              className={cn(
                "p-6 rounded-3xl bg-white border transition-all cursor-pointer relative flex flex-col justify-between group shadow-md shadow-slate-200/40 hover:shadow-xl hover:-translate-y-1",
                ann.isImportant
                  ? "border-blue-300 ring-2 ring-blue-500/20 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20"
                  : "border-slate-200/80 hover:border-blue-300"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    {ann.isImportant && (
                      <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        <Pin className="w-3 h-3 text-blue-600" />
                        Pinned Announcement
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {ann.category}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {ann.date}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {ann.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {ann.message}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px]">
                  Target: <strong className="text-slate-800">{ann.targetAudience}</strong>
                </span>

                <div className="flex items-center gap-1 text-blue-600 font-bold group-hover:translate-x-1 transition-transform">
                  <span>Read Announcement</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Announcements Button for Home Page */}
        {(showViewAllButton || (limit && announcements.length > limit)) && (
          <div className="mt-10 text-center flex flex-col items-center justify-center">
            <Link
              href="/announcements"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 text-slate-800 hover:text-blue-600 font-bold text-xs sm:text-sm shadow-xs hover:shadow-md transition-all cursor-pointer"
            >
              <span>View All Broadcast Announcements ({announcements.length})</span>
              <ChevronRight className="w-4 h-4 text-blue-600" />
            </Link>
          </div>
        )}
      </div>

      {/* Detail Light Modal */}
      <AnimatePresence>
        {activeAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg w-full bg-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-200 text-slate-900 space-y-4"
            >
              <button
                onClick={() => setActiveAnnouncement(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {activeAnnouncement.category}
                </span>
                <span className="text-xs text-slate-500">{activeAnnouncement.date}</span>
              </div>

              <h3 className="text-xl font-bold font-display text-slate-900">{activeAnnouncement.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{activeAnnouncement.message}</p>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Audience: <strong className="text-slate-800">{activeAnnouncement.targetAudience}</strong></span>
                <span className="flex items-center gap-1 text-blue-600 font-bold">
                  <Eye className="w-4 h-4" />
                  {activeAnnouncement.readCount || 0} Reads
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
