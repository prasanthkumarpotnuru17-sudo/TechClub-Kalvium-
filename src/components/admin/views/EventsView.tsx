"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Plus,
  Search,
  Grid,
  List,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Archive,
  MoreVertical,
  MapPin,
  Clock,
  Users,
  Sparkles,
  Lock,
  Globe,
  Bell,
  Send,
  Loader2,
  Ban,
  AlertTriangle,
  XCircle,
  RotateCcw,
  CalendarClock,
  ChevronRight
} from "lucide-react";
import { EventItem } from "@/lib/services/mockData";
import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { notificationService } from "@/services/notificationService";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface EventsViewProps {
  onOpenCreateModal: () => void;
  onOpenEditModal: (evt: EventItem) => void;
  onViewRegistrations?: (evtId?: string) => void;
}

export function EventsView({ onOpenCreateModal, onOpenEditModal, onViewRegistrations }: EventsViewProps) {
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [reminderStatusMsg, setReminderStatusMsg] = useState<{ id: string; text: string; type: "success" | "error" } | null>(null);

  const [registrationsList, setRegistrationsList] = useState<any[]>([]);

  // Cancellation Modal State
  const [cancelModalEvt, setCancelModalEvt] = useState<EventItem | null>(null);
  const [cancellationReasonInput, setCancellationReasonInput] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelFeedback, setCancelFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Restore Modal State
  const [restoreModalEvt, setRestoreModalEvt] = useState<EventItem | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Reschedule Modal State
  const [rescheduleModalEvt, setRescheduleModalEvt] = useState<EventItem | null>(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState("");
  const [rescheduleNewTime, setRescheduleNewTime] = useState("");
  const [rescheduleNewVenue, setRescheduleNewVenue] = useState("");
  const [rescheduleReasonInput, setRescheduleReasonInput] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Post-Cancellation Summary Modal State
  const [summaryModalData, setSummaryModalData] = useState<{
    eventId: string;
    eventTitle: string;
    totalTargeted: number;
    successCount: number;
    failedCount: number;
    skippedCount?: number;
    notificationStatus: string;
  } | null>(null);
  const [isRetryingFailed, setIsRetryingFailed] = useState(false);

  const { registrations: adminRegs } = useAdminRegistrations();

  useEffect(() => {
    setRegistrationsList(adminRegs);
  }, [adminRegs]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubEvents = eventService.subscribeAllEvents(
      (data) => {
        setEventsList(data);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to events:", err);
        setError("Missing or insufficient permissions to read events.");
        setLoading(false);
      }
    );
    return () => {
      unsubEvents();
    };
  }, []);

  const getEventRegisteredCount = (evt: EventItem) => {
    const activeCount = registrationsList.filter(
      (r) => !r.isDeleted && (r.status || "").toLowerCase() !== "cancelled" && (r.status || "").toLowerCase() !== "rejected" && (
        r.eventId === evt.id || 
        (r.eventName && evt.title && r.eventName.toLowerCase().trim() === evt.title.toLowerCase().trim()) ||
        (r.eventTitle && evt.title && r.eventTitle.toLowerCase().trim() === evt.title.toLowerCase().trim())
      )
    ).length;
    return activeCount;
  };

  const categories = ["All", "Upcoming", "AI/ML", "Web Dev", "Cloud", "Hackathon", "Cybersecurity"];

  const isUpcomingEvent = (evt: EventItem) => {
    if (evt.status === "Cancelled" || evt.status === "Completed" || evt.status === "Archived") {
      return false;
    }
    // Spotlight banner in Admin Dashboard highlights events with status "Upcoming" (awaiting publication)
    return evt.status === "Upcoming" || (evt.status as string) === "upcoming";
  };

  const upcomingEvents = eventsList.filter(isUpcomingEvent);

  const filteredEvents = eventsList.filter((e) => {
    const matchesCat =
      activeCategory === "All"
        ? true
        : activeCategory === "Upcoming"
        ? isUpcomingEvent(e)
        : e.category === activeCategory;
    const matchesSearch =
      (e.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.organizer ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.venue ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleTogglePublish = async (id: string) => {
    const target = eventsList.find((e) => e.id === id);
    if (!target) return;
    const nextStatus = target.status === "Published" ? "Upcoming" : "Published";
    await eventService.updateEvent(id, { status: nextStatus });
  };

  const handleToggleCloseReg = async (id: string) => {
    const target = eventsList.find((e) => e.id === id);
    if (!target) return;
    const nextStatus = target.status === "Closed" ? "Published" : "Closed";
    await eventService.updateEvent(id, { status: nextStatus });
  };

  const handleArchive = async (id: string) => {
    await eventService.updateEvent(id, { status: "Archived" });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      await eventService.deleteEvent(id);
    }
  };

  const handleSendReminderNow = async (evt: EventItem) => {
    if (!confirm(`Send event reminder now to all registered participants of "${evt.title}"?`)) {
      return;
    }
    setSendingReminderId(evt.id);
    setReminderStatusMsg(null);
    try {
      let clientRegs: any[] = [];
      try {
        clientRegs = await registrationService.getRegistrationsByEventId(evt.id);
      } catch (clientFetchErr) {
        console.warn("[EventsView] Could not fetch client registrations fallback:", clientFetchErr);
      }

      const res = await notificationService.triggerEventReminderNow(evt.id, clientRegs, evt);
      if (res.success) {
        const count = (res as any).sent ?? res.data?.sent ?? 0;
        setReminderStatusMsg({
          id: evt.id,
          text: `Reminder dispatched successfully to ${count} registered participant(s).`,
          type: "success",
        });
      } else {
        setReminderStatusMsg({
          id: evt.id,
          text: res.message || (res as any).error || "Failed to dispatch reminder.",
          type: "error",
        });
      }
    } catch (err: any) {
      setReminderStatusMsg({
        id: evt.id,
        text: err.message || "Error triggering event reminder.",
        type: "error",
      });
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleConfirmCancelEvent = async () => {
    if (!cancelModalEvt) return;
    if (!cancellationReasonInput.trim()) {
      alert("Please provide a reason for cancelling this event.");
      return;
    }

    try {
      setIsCancelling(true);
      setCancelFeedback(null);

      let clientRegs: any[] = [];
      try {
        clientRegs = registrationsList.filter(
          (r) => !r.isDeleted && (r.status || "").toLowerCase() !== "cancelled" && (r.status || "").toLowerCase() !== "rejected" && (
            r.eventId === cancelModalEvt.id || 
            (r.eventName && cancelModalEvt.title && r.eventName.toLowerCase().trim() === cancelModalEvt.title.toLowerCase().trim()) ||
            ((r as any).eventTitle && cancelModalEvt.title && (r as any).eventTitle.toLowerCase().trim() === cancelModalEvt.title.toLowerCase().trim())
          )
        );
        if (clientRegs.length === 0) {
          clientRegs = await registrationService.getRegistrationsByEventId(cancelModalEvt.id);
        }
      } catch (_) {}

      const res = await eventService.cancelEvent(
        cancelModalEvt.id, 
        cancellationReasonInput.trim(), 
        "Admin", 
        false,
        clientRegs
      );

      const targetEvt = cancelModalEvt;
      setCancelModalEvt(null);
      setCancellationReasonInput("");

      setSummaryModalData({
        eventId: targetEvt.id,
        eventTitle: targetEvt.title,
        totalTargeted: res?.data?.totalTargeted ?? getEventRegisteredCount(targetEvt),
        successCount: res?.data?.successCount ?? 0,
        failedCount: res?.data?.failedCount ?? 0,
        skippedCount: res?.data?.skippedCount ?? 0,
        notificationStatus: res?.data?.notificationStatus ?? "Cancellation Sent"
      });

    } catch (err: any) {
      console.error("[EventsView] Error cancelling event:", err);
      setCancelFeedback({
        text: err.message || "Failed to cancel event.",
        type: "error"
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetryFailed = async (eventId: string) => {
    setIsRetryingFailed(true);
    try {
      const res = await eventService.retryFailedCancellationNotifications(eventId);
      if (res?.success) {
        alert(`Retry completed! Successfully sent: ${res.data?.successCount ?? 0}, Failed: ${res.data?.failedCount ?? 0}`);
        if (summaryModalData && summaryModalData.eventId === eventId) {
          setSummaryModalData({
            ...summaryModalData,
            successCount: summaryModalData.successCount + (res.data?.successCount ?? 0),
            failedCount: res.data?.failedCount ?? 0,
            notificationStatus: res.data?.notificationStatus ?? summaryModalData.notificationStatus
          });
        }
      } else {
        alert(res?.message || "Failed to retry notifications.");
      }
    } catch (err: any) {
      alert("Error retrying failed notifications: " + (err.message || err));
    } finally {
      setIsRetryingFailed(false);
    }
  };

  const handleConfirmRestoreEvent = async () => {
    if (!restoreModalEvt) return;
    setIsRestoring(true);
    try {
      await eventService.restoreEvent(restoreModalEvt.id, "Admin");
      setRestoreModalEvt(null);
    } catch (err: any) {
      alert("Failed to restore event: " + (err.message || err));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmRescheduleEvent = async () => {
    if (!rescheduleModalEvt) return;
    if (!rescheduleNewDate.trim()) {
      alert("Please specify the new event date.");
      return;
    }
    if (!rescheduleNewTime.trim()) {
      alert("Please specify the new event time.");
      return;
    }

    setIsRescheduling(true);

    try {
      let clientRegs: any[] = [];
      try {
        clientRegs = registrationsList.filter(
          (r) => !r.isDeleted && (r.status || "").toLowerCase() !== "cancelled" && (r.status || "").toLowerCase() !== "rejected" && (
            r.eventId === rescheduleModalEvt.id || 
            (r.eventName && rescheduleModalEvt.title && r.eventName.toLowerCase().trim() === rescheduleModalEvt.title.toLowerCase().trim()) ||
            ((r as any).eventTitle && rescheduleModalEvt.title && (r as any).eventTitle.toLowerCase().trim() === rescheduleModalEvt.title.toLowerCase().trim())
          )
        );
        if (clientRegs.length === 0) {
          clientRegs = await registrationService.getRegistrationsByEventId(rescheduleModalEvt.id);
        }
      } catch (_) {}

      const res = await eventService.rescheduleEvent(
        rescheduleModalEvt.id,
        rescheduleNewDate.trim(),
        rescheduleNewTime.trim(),
        rescheduleNewVenue.trim() || rescheduleModalEvt.venue,
        rescheduleReasonInput.trim() || "Event rescheduled due to schedule updates.",
        "Admin",
        clientRegs
      );

      const targetEvt = rescheduleModalEvt;
      setRescheduleModalEvt(null);
      setRescheduleNewDate("");
      setRescheduleNewTime("");
      setRescheduleNewVenue("");
      setRescheduleReasonInput("");

      setSummaryModalData({
        eventId: targetEvt.id,
        eventTitle: targetEvt.title,
        totalTargeted: res?.data?.totalTargeted ?? getEventRegisteredCount(targetEvt),
        successCount: res?.data?.successCount ?? 0,
        failedCount: res?.data?.failedCount ?? 0,
        skippedCount: res?.data?.skippedCount ?? 0,
        notificationStatus: res?.data?.notificationStatus ?? "Reschedule Sent"
      });

    } catch (err: any) {
      console.error("[EventsView] Error rescheduling event:", err);
      alert("Failed to reschedule event: " + (err.message || err));
    } finally {
      setIsRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-indigo-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center space-y-2">
        <h4 className="font-bold text-sm">Firestore Permission Error</h4>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* UPCOMING EVENTS SPOTLIGHT SECTION */}
      <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-xl shadow-indigo-600/15 border border-indigo-500/30 relative overflow-hidden space-y-5">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
              <CalendarClock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black font-display text-white tracking-tight">
                  Upcoming Events Spotlight
                </h3>
                <span className="px-3 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white border border-white/30 backdrop-blur-md shadow-xs">
                  {upcomingEvents.length} Active Upcoming
                </span>
              </div>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                Monitor live registrations, schedule reminders, and manage upcoming club sessions
              </p>
            </div>
          </div>

          {upcomingEvents.length > 0 && (
            <button
              onClick={() => setActiveCategory("Upcoming")}
              className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold transition-all backdrop-blur-md flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
            >
              <span>View All Upcoming</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white/10 border border-white/15 text-indigo-100 text-xs flex flex-col items-center justify-center gap-2 backdrop-blur-md">
            <Calendar className="w-8 h-8 text-indigo-200" />
            <p className="font-bold text-sm text-white">No upcoming events scheduled at the moment</p>
            <button
              onClick={onOpenCreateModal}
              className="mt-2 px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Schedule New Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {upcomingEvents.slice(0, 3).map((evt) => {
              const regCount = getEventRegisteredCount(evt);
              const capacity = evt.capacity || 1;
              const fillPct = Math.min(100, Math.round((regCount / capacity) * 100));

              return (
                <motion.div
                  key={`upcoming-spotlight-${evt.id}`}
                  whileHover={{ y: -3 }}
                  className="rounded-2xl bg-white/15 dark:bg-slate-900/90 border border-white/25 dark:border-slate-800 p-4.5 space-y-3.5 flex flex-col justify-between shadow-xl backdrop-blur-md"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={evt.banner || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"}
                      alt={evt.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/30 shadow-md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-white/20 text-white border border-white/30 uppercase tracking-wider">
                          {evt.category || "Event"}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black border",
                            evt.status === "Published"
                              ? "bg-emerald-400/30 text-emerald-100 border-emerald-300/40"
                              : "bg-amber-400/30 text-amber-100 border-amber-300/40"
                          )}
                        >
                          {evt.status || "Upcoming"}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white truncate font-display" title={evt.title}>
                        {evt.title}
                      </h4>
                      <p className="text-xs text-indigo-100 flex items-center gap-1 mt-0.5 truncate font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                        <span>{evt.date} • {evt.time}</span>
                      </p>
                    </div>
                  </div>

                  {/* Seat Registration Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-indigo-100">Registrations</span>
                      <span className="text-white font-extrabold">
                        {regCount} / {capacity} ({fillPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-black/20 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          fillPct >= 90 ? "bg-rose-400" : fillPct >= 50 ? "bg-amber-300" : "bg-emerald-400"
                        )}
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center justify-between gap-1 pt-2.5 border-t border-white/20 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenEditModal(evt)}
                        className="p-1.5 rounded-xl text-white bg-white/15 hover:bg-white/30 border border-white/20 transition-all cursor-pointer shadow-xs"
                        title="Edit Event"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onViewRegistrations?.(evt.id)}
                        className="p-1.5 rounded-xl text-white bg-white/15 hover:bg-white/30 border border-white/20 transition-all cursor-pointer shadow-xs"
                        title="View Registrations"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setRescheduleModalEvt(evt);
                          setRescheduleNewDate(evt.date || "");
                          setRescheduleNewTime(evt.time || "");
                          setRescheduleNewVenue(evt.venue || "");
                          setRescheduleReasonInput("Event rescheduled due to schedule updates.");
                        }}
                        className="p-1.5 rounded-xl text-white bg-white/15 hover:bg-white/30 border border-white/20 transition-all cursor-pointer shadow-xs"
                        title="Reschedule Event"
                      >
                        <CalendarClock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendReminderNow(evt)}
                        disabled={sendingReminderId === evt.id}
                        className="p-1.5 rounded-xl text-white bg-white/15 hover:bg-white/30 border border-white/20 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                        title="Send Reminder Now"
                      >
                        {sendingReminderId === evt.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Bell className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] text-indigo-100 font-medium truncate max-w-[110px]" title={evt.venue}>
                      📍 {evt.venue}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                activeCategory === cat
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* View Switcher & Create Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                viewMode === "grid"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                viewMode === "table"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter events by title, venue or organizer..."
          className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* Grid View Rendering */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400 glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col items-center justify-center space-y-2">
              <Calendar className="w-8 h-8 text-gray-400" />
              <p className="font-semibold text-sm">No events found matching the search/filters</p>
            </div>
          ) : (
            filteredEvents.map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card glass-card-hover rounded-3xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 flex flex-col group"
              >
                {/* Image & Badges */}
                <div className="relative h-44 overflow-hidden bg-slate-900/10">
                  <img
                    src={evt.banner || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80"}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2.5 py-1 rounded-full text-white backdrop-blur-md",
                        evt.type === "Campus" ? "bg-blue-600/80" : "bg-purple-600/80"
                      )}
                    >
                      {evt.type || "Campus"}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-md">
                      {evt.category || "General"}
                    </span>
                  </div>

                  <span
                    className={cn(
                      "absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-md",
                      evt.status === "Cancelled"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 font-black"
                        : evt.status === "Published"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                        : evt.status === "Closed"
                        ? "bg-red-500/20 text-red-300 border-red-500/40"
                        : "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                    )}
                  >
                    {evt.status || "Upcoming"}
                  </span>

                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[11px] font-semibold text-blue-400">{evt.date}</p>
                    <h3 className="text-sm font-bold text-white font-display line-clamp-1 mt-0.5">{evt.title}</h3>
                  </div>
                </div>

                {/* Content & Progress */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>

                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">{evt.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{evt.time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>Organizer: <strong className="text-gray-700 dark:text-gray-300">{evt.organizer}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-gray-500">Registrations</span>
                        <span className="text-blue-600 dark:text-blue-400 font-bold">
                          {getEventRegisteredCount(evt)} / {evt.capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${Math.min(100, Math.round(((getEventRegisteredCount(evt)) / (evt.capacity || 1)) * 100))}%` }}
                        />
                      </div>
                    </div>

                    {reminderStatusMsg?.id === evt.id && (
                      <div
                        className={cn(
                          "p-2 rounded-xl text-xs font-medium border text-center",
                          reminderStatusMsg.type === "success"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 border-red-500/20"
                        )}
                      >
                        {reminderStatusMsg.text}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button
                          onClick={() => onOpenEditModal(evt)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </button>

                        {/* View Registrations */}
                        <button
                          onClick={() => onViewRegistrations?.(evt.id)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="View Registrations"
                        >
                          <Eye className="w-4 h-4 text-indigo-500" />
                        </button>

                        {/* Reschedule Event */}
                        <button
                          onClick={() => {
                            setRescheduleModalEvt(evt);
                            setRescheduleNewDate(evt.date || "");
                            setRescheduleNewTime(evt.time || "");
                            setRescheduleNewVenue(evt.venue || "");
                            setRescheduleReasonInput("Event rescheduled due to schedule updates.");
                          }}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 hover:text-cyan-600 cursor-pointer"
                          title="Reschedule Event"
                        >
                          <CalendarClock className="w-4 h-4 text-cyan-500" />
                        </button>

                        {/* Send Reminder Now */}
                        <button
                          onClick={() => handleSendReminderNow(evt)}
                          disabled={sendingReminderId === evt.id}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 cursor-pointer disabled:opacity-50"
                          title="Send Reminder Now"
                        >
                          {sendingReminderId === evt.id ? (
                            <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                          ) : (
                            <Bell className="w-4 h-4 text-amber-500" />
                          )}
                        </button>

                        {/* Status Toggles */}
                        <button
                          onClick={() => handleTogglePublish(evt.id)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title={evt.status === "Published" ? "Unpublish to Upcoming (Close Registrations)" : "Publish Event (Open Registrations)"}
                        >
                          <Globe className="w-4 h-4 text-emerald-500" />
                        </button>
                        <button
                          onClick={() => handleToggleCloseReg(evt.id)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title={evt.status === "Closed" ? "Re-open Registration" : "Close Registration"}
                        >
                          <Lock className="w-4 h-4 text-amber-500" />
                        </button>
                        <button
                          onClick={() => handleArchive(evt.id)}
                          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                          title="Archive Event"
                        >
                          <Archive className="w-4 h-4 text-purple-500" />
                        </button>

                        {/* Cancel / Restore Event */}
                        {evt.status !== "Cancelled" ? (
                          <button
                            onClick={() => {
                              setCancelModalEvt(evt);
                              setCancellationReasonInput("Event cancelled due to unforeseen schedule changes.");
                              setCancelFeedback(null);
                            }}
                            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 cursor-pointer"
                            title="Cancel Event & Notify Participants"
                          >
                            <Ban className="w-4 h-4 text-rose-500" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setRestoreModalEvt(evt)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                            title="Restore Cancelled Event"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(evt.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Table View Rendering */
        <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60">
                <tr>
                  <th className="p-4">Event Title</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Venue</th>
                  <th className="p-4">Registrations</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No events found matching the search/filters.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <img src={evt.banner} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold">{evt.title}</p>
                          <p className="text-[10px] text-gray-400">{evt.organizer}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {evt.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {evt.date}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{evt.venue}</td>
                    <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">
                      {getEventRegisteredCount(evt)} / {evt.capacity}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                          evt.status === "Published"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : evt.status === "Cancelled"
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold"
                        )}
                      >
                        {evt.status || "Upcoming"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => onOpenEditModal(evt)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                          title="Edit Event"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* View Registrations */}
                        <button
                          onClick={() => onViewRegistrations?.(evt.id)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 cursor-pointer"
                          title="View Registrations"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Reschedule Event */}
                        <button
                          onClick={() => {
                            setRescheduleModalEvt(evt);
                            setRescheduleNewDate(evt.date || "");
                            setRescheduleNewTime(evt.time || "");
                            setRescheduleNewVenue(evt.venue || "");
                            setRescheduleReasonInput("Event rescheduled due to schedule updates.");
                          }}
                          className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50 cursor-pointer"
                          title="Reschedule Event"
                        >
                          <CalendarClock className="w-4 h-4" />
                        </button>

                        {/* Send Reminder Now */}
                        <button
                          onClick={() => handleSendReminderNow(evt)}
                          disabled={sendingReminderId === evt.id}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer disabled:opacity-50"
                          title="Send Reminder Now"
                        >
                          {sendingReminderId === evt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Bell className="w-4 h-4" />
                          )}
                        </button>

                        {/* Cancel Event */}
                        {evt.status !== "Cancelled" && (
                          <button
                            onClick={() => {
                              setCancelModalEvt(evt);
                              setCancellationReasonInput("Event cancelled due to unforeseen schedule changes.");
                              setCancelFeedback(null);
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            title="Cancel Event & Notify Participants"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                          title="Delete Event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CANCEL EVENT CONFIRMATION MODAL */}
      {cancelModalEvt && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Cancel Event Confirmation</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{cancelModalEvt.title}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-gray-600 dark:text-gray-300">
              <p className="font-bold text-gray-900 dark:text-white">Executing cancellation will:</p>
              <ul className="space-y-1 pl-4 list-disc text-gray-600 dark:text-gray-400">
                <li>Set event status to <strong className="text-rose-600 font-bold">Cancelled</strong> & reset available seats to 0</li>
                <li>Dispatch cancellation emails to all <strong className="text-blue-600 font-bold">{getEventRegisteredCount(cancelModalEvt)} registered participant(s)</strong></li>
                <li>Disable future registrations, attendance tracking, and certificate generation</li>
                <li>Write entries to audit notification logs with correlation tracking</li>
              </ul>
              <p className="text-[11px] text-rose-500 font-semibold pt-1">⚠️ This action cannot be undone automatically.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Cancellation Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReasonInput}
                onChange={(e) => setCancellationReasonInput(e.target.value)}
                placeholder="State reason for cancelling (e.g. speaker unavailable, venue clash)..."
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 p-3 text-xs focus:ring-2 focus:ring-rose-500 bg-slate-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-white focus:outline-none"
              />
            </div>

            {cancelFeedback && (
              <div className={cn(
                "p-3 rounded-xl text-xs font-medium border text-center",
                cancelFeedback.type === "success" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              )}>
                {cancelFeedback.text}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setCancelModalEvt(null)}
                className="flex-1 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelEvent}
                className="flex-1 py-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Confirm & Cancel Event
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST-CANCELLATION ADMIN SUMMARY MODAL */}
      {summaryModalData && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Cancellation Completed</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{summaryModalData.eventTitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Targeted</p>
                <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{summaryModalData.totalTargeted}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-center">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Emails Sent</p>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{summaryModalData.successCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-center">
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Failed</p>
                <p className="text-xl font-black text-rose-700 dark:text-rose-300 mt-0.5">{summaryModalData.failedCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-center">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Status</p>
                <p className="text-xs font-black text-blue-700 dark:text-blue-300 mt-1">{summaryModalData.notificationStatus}</p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              {summaryModalData.failedCount > 0 && (
                <button
                  type="button"
                  disabled={isRetryingFailed}
                  onClick={() => handleRetryFailed(summaryModalData.eventId)}
                  className="w-full py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isRetryingFailed ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Retrying Failed...
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" /> Retry Failed Notifications ({summaryModalData.failedCount})
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSummaryModalData(null)}
                className="w-full py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE EVENT MODAL */}
      {rescheduleModalEvt && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Reschedule Event</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{rescheduleModalEvt.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Date *</label>
                  <input
                    type="text"
                    value={rescheduleNewDate}
                    onChange={(e) => setRescheduleNewDate(e.target.value)}
                    placeholder="e.g. October 15, 2026"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Time *</label>
                  <input
                    type="text"
                    value={rescheduleNewTime}
                    onChange={(e) => setRescheduleNewTime(e.target.value)}
                    placeholder="e.g. 10:00 AM - 1:00 PM"
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Venue</label>
                <input
                  type="text"
                  value={rescheduleNewVenue}
                  onChange={(e) => setRescheduleNewVenue(e.target.value)}
                  placeholder="e.g. Main Auditorium, Campus"
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Reschedule Reason *</label>
                <textarea
                  rows={2}
                  value={rescheduleReasonInput}
                  onChange={(e) => setRescheduleReasonInput(e.target.value)}
                  placeholder="Explain why this event is being rescheduled..."
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-gray-100 font-semibold focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-700 dark:text-cyan-300">
                <p className="font-bold mb-1">Webhook & Notification Dispatch:</p>
                <p className="text-[11px] opacity-90">
                  Rescheduling will update event metadata in Firestore and dispatch real-time rescheduling notifications via webhook to registered participants.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isRescheduling}
                onClick={() => setRescheduleModalEvt(null)}
                className="flex-1 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isRescheduling}
                onClick={handleConfirmRescheduleEvent}
                className="flex-1 py-3 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRescheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Dispatching Reschedule...
                  </>
                ) : (
                  <>
                    <CalendarClock className="w-4 h-4" /> Confirm & Reschedule Event
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE EVENT CONFIRMATION MODAL */}
      {restoreModalEvt && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl relative text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Restore Cancelled Event</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{restoreModalEvt.title}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-300 space-y-2 text-left">
              <p className="font-bold text-gray-900 dark:text-white">Restoring this event will:</p>
              <ul className="space-y-1 pl-4 list-disc text-gray-500 dark:text-gray-400">
                <li>Change event status back to <strong className="text-emerald-600 font-bold">Published</strong></li>
                <li>Re-open student registrations and enable website booking</li>
                <li>Preserve previous cancellation notification logs as audit history</li>
              </ul>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isRestoring}
                onClick={() => setRestoreModalEvt(null)}
                className="flex-1 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl border border-gray-300 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleConfirmRestoreEvent}
                className="flex-1 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" /> Confirm Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
