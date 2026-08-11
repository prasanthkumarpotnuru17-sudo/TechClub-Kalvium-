"use client";

import React from "react";
import {
  Users,
  UserCheck,
  Calendar,
  Clock,
  Briefcase,
  FileCheck,
  CheckCircle,
  Award,
  ArrowUpRight,
  TrendingUp,
  Plus,
  ArrowRight,
  Sparkles,
  Activity,
  FileSpreadsheet,
  UserPlus,
  Bell,
  Megaphone,
  Eye,
  MessageSquare,
  Mail,
  Trash2
} from "lucide-react";
import { eventService } from "@/services/eventService";
import { announcementService } from "@/services/announcementService";
import { subscribeRecentActivities, clearAllActivityLogs } from "@/services/activityLogService";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { userService } from "@/services/userService";
import { contactMessageService, ContactMessageItem } from "@/services/contactMessageService";
import { EventItem } from "@/lib/services/mockData";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DashboardOverviewProps {
  onNavigateTab: (tab: any) => void;
  onOpenQuickAction: (action: any) => void;
}

export function DashboardOverview({ onNavigateTab, onOpenQuickAction }: DashboardOverviewProps) {
  const [eventsCount, setEventsCount] = React.useState<number>(0);
  const [regsCount, setRegsCount] = React.useState<number>(0);
  const [membersCount, setMembersCount] = React.useState<number>(0);
  const [liveEvents, setLiveEvents] = React.useState<EventItem[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  const [contactMessages, setContactMessages] = React.useState<ContactMessageItem[]>([]);
  const [msgStats, setMsgStats] = React.useState({ unread: 0, read: 0, resolved: 0, total: 0 });

  const { registrations: liveRegs } = useAdminRegistrations();

  React.useEffect(() => {
    const activeRegs = liveRegs.filter((r) => !r.isDeleted && !(r as any).deleted && r.status !== "CANCELLED" && (r.status as string) !== "Cancelled");
    setRegsCount(activeRegs.length);
  }, [liveRegs]);

  React.useEffect(() => {
    const unsubEvents = eventService.subscribeAllEvents((evts) => {
      setEventsCount(evts.length);
      setLiveEvents(evts.slice(0, 3));
    });
    const unsubUsers = userService.subscribeUsers((users) => {
      setMembersCount(users.length);
    });
    const unsubAnns = announcementService.subscribeAnnouncements((anns) => {
      setAnnouncements(anns.slice(0, 3));
    });
    const unsubActivity = subscribeRecentActivities((logs) => {
      setRecentActivity(logs);
    }, 10);
    const unsubMsgs = contactMessageService.subscribeMessages((msgs) => {
      setContactMessages(msgs.slice(0, 3));
      const unread = msgs.filter((m) => !m.isRead && m.status !== "Archived").length;
      const read = msgs.filter((m) => m.isRead && m.status !== "Archived").length;
      const resolved = msgs.filter((m) => m.status === "Resolved").length;
      setMsgStats({ unread, read, resolved, total: msgs.length });
    });

    return () => {
      unsubEvents();
      unsubUsers();
      unsubAnns();
      unsubActivity();
      unsubMsgs();
    };
  }, []);

  const kpiCards = [
    { id: "kpi-1", title: "Total Registrations", value: regsCount, iconName: "FileCheck", change: "Live" },
    { id: "kpi-2", title: "Active Events", value: eventsCount, iconName: "Calendar", change: "Live" },
    { id: "kpi-3", title: "Total Members", value: membersCount, iconName: "Users", change: "Live" },
  ];

  const iconMap: Record<string, any> = { Users, UserCheck, Calendar, Clock, Briefcase, FileCheck, CheckCircle, Award };

  const getEventRegCount = (evt: any) => {
    const active = liveRegs.filter(
      (r) => !r.isDeleted && (r.status || "").toLowerCase() !== "cancelled" && (r.status || "").toLowerCase() !== "rejected" && (
        r.eventId === evt.id ||
        (r.eventName && evt.title && r.eventName.toLowerCase().trim() === evt.title.toLowerCase().trim()) ||
        ((r as any).eventTitle && evt.title && (r as any).eventTitle.toLowerCase().trim() === evt.title.toLowerCase().trim())
      )
    ).length;
    return active;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/10">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Command Center</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
              Tech Club Management Command Center
            </h2>
            <p className="text-blue-100 text-xs md:text-sm mt-1 max-w-2xl">
              Track real-time registrations, event metrics, domain performance, and automated n8n & Google Sheets workflows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenQuickAction("create-event")}
              className="px-4 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-semibold text-xs md:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
            <button
              onClick={() => onNavigateTab("announcements")}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-medium text-xs md:text-sm rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-4 h-4" />
              Announcements
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Key Performance Indicators (KPIs)
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">Live from Firestore</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {kpiCards.map((card, idx) => {
            const Icon = iconMap[card.iconName] || Users;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
                className="p-5 rounded-2xl glass-card border border-gray-200/60 dark:border-gray-800/60 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    {card.change}
                  </span>
                </div>
                <h4 className="text-2xl font-extrabold font-display text-gray-900 dark:text-white">
                  {card.value}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  {card.title}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Quick Actions, Active Events, Announcements & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Action Shortcuts Panel */}
          <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
              Quick Admin Actions
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => onOpenQuickAction("create-event")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/50 dark:border-blue-800/40 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Create Event</span>
              </button>

              <button
                onClick={() => onOpenQuickAction("add-opportunity")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200/50 dark:border-purple-800/40 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Add Opportunity</span>
              </button>

              <button
                onClick={() => onOpenQuickAction("send-notification")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200/50 dark:border-amber-800/40 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Broadcast Alert</span>
              </button>

              <button
                onClick={() => onOpenQuickAction("export-registrations")}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/40 transition-all text-center group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Export Regs</span>
              </button>
            </div>
          </div>

          {/* Announcements from Firestore */}
          <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-purple-500" />
                Announcements & Broadcast Alerts
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenQuickAction("send-notification")}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Broadcast
                </button>
                <button
                  onClick={() => onNavigateTab("announcements")}
                  className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                No announcements yet. Create one to broadcast to your members.
              </p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200/40 dark:border-purple-900/40 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {ann.category}
                        </span>
                        {ann.targetAudience && (
                          <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                            Target: {ann.targetAudience}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">{ann.title}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">{ann.message}</p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-semibold text-purple-600 dark:text-purple-400 bg-white/60 dark:bg-gray-800 px-2.5 py-1 rounded-lg">
                        <Eye className="w-3.5 h-3.5 text-purple-500" />
                        {ann.readCount || 0} Reads
                      </span>
                      <span className="text-[10px] text-gray-400">{ann.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PHASE 6: Contact Messages Dashboard Card Widget */}
          <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  New Contact Messages
                </h3>
                {msgStats.unread > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black animate-pulse">
                    {msgStats.unread} Unread
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigateTab("contact_messages")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View Messages
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Stat Counters Row */}
            <div className="grid grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-gray-200/60 dark:border-gray-800 text-center">
              <div>
                <span className="text-[10px] text-gray-400 font-medium block">Total</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{msgStats.total}</span>
              </div>
              <div>
                <span className="text-[10px] text-purple-500 font-medium block">Unread</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{msgStats.unread}</span>
              </div>
              <div>
                <span className="text-[10px] text-blue-500 font-medium block">Read</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{msgStats.read}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-500 font-medium block">Resolved</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{msgStats.resolved}</span>
              </div>
            </div>

            {/* Latest Messages Preview List */}
            {contactMessages.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                No contact messages received yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {contactMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => onNavigateTab("contact_messages")}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                      !msg.isRead
                        ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/60 dark:border-purple-900/40"
                        : "bg-slate-50/50 dark:bg-slate-950/30 border-gray-200/50 dark:border-gray-800"
                    )}
                  >
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {msg.fullName}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate">
                          ({msg.email})
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
                        {msg.subject || "General Inquiry"}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {msg.message}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold border block mb-1",
                          msg.status === "New"
                            ? "bg-purple-100 text-purple-700 border-purple-200"
                            : msg.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                        )}
                      >
                        {msg.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Events Overview */}
          <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Featured Active Events
              </h3>
              <button
                onClick={() => onNavigateTab("events")}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                View All Events
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {liveEvents.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
                No events yet. Create your first event to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {liveEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors gap-3 border border-gray-100 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={evt.banner || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"}
                        alt={evt.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                          {evt.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {evt.date || "TBD"} • {evt.venue || "TBD"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          {getEventRegCount(evt)} / {evt.capacity || "∞"}
                        </span>
                        <p className="text-[10px] text-gray-500">Registered</p>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded-lg border",
                          evt.status === "Published"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {evt.status || "Draft"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Recent Activity Feed from Firestore */}
        <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Recent Activity Feed
            </h3>
            <div className="flex items-center gap-2">
              {recentActivity.length > 0 && (
                <button
                  onClick={async () => {
                    if (confirm("Reset and clear all recent activity logs?")) {
                      await clearAllActivityLogs();
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 transition-colors cursor-pointer"
                  title="Clear all activity logs"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Feed
                </button>
              )}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {recentActivity.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">
              No recent activity yet.
            </p>
          ) : (
            <div className="relative space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Vertical timeline connector line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-800 pointer-events-none" />

              {recentActivity.map((act) => (
                <div key={act.id} className="relative flex items-start gap-3 pl-1 group">
                  <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 border-2 border-white dark:border-gray-900 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 z-10 group-hover:scale-110 transition-transform">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <p className="text-gray-900 dark:text-gray-100 leading-snug">
                      <span className="font-semibold">{act.user}</span> {act.action}{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">{act.target}</span>
                    </p>
                    <span className="text-[10px] text-gray-400 mt-0.5 block">{act.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
