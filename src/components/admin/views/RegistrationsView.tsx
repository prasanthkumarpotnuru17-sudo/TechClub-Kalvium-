"use client";

import React, { useState, useEffect } from "react";
import {
  FileCheck,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUpDown,
  UserCheck,
  Sparkles,
  Calendar,
  Users,
  ShieldCheck,
  CheckCircle2,
  Globe,
  Mail,
  UserPlus,
  Trash2,
  UploadCloud
} from "lucide-react";
import {
  RegistrationItem,
  EventItem,
  UserItem
} from "@/lib/services/mockData";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { eventService } from "@/services/eventService";
import { userService } from "@/services/userService";
import { exportToCSV, exportToExcel } from "@/lib/services/exportUtils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";
import { AddParticipantModal } from "../modals/AddParticipantModal";
import { ImportCSVModal } from "../modals/ImportCSVModal";

export function RegistrationsView() {
  const [mainViewMode, setMainViewMode] = useState<"events" | "signups">("events");
  const [selectedEventId, setSelectedEventId] = useState<string>("all");

  const [regs, setRegs] = useState<RegistrationItem[]>([]);
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortField, setSortField] = useState<"name" | "date" | "status">("date");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { role } = useAuth();
  
  const canManageParticipants = hasPermission(role, "ADD_PARTICIPANT");
  const canImport = hasPermission(role, "IMPORT_CSV");

  const { registrations: liveRegs, loading: adminRegsLoading } = useAdminRegistrations();

  useEffect(() => {
    setRegs(liveRegs as unknown as RegistrationItem[]);
    setLoading(false);
  }, [liveRegs]);

  useEffect(() => {
    setError(null);

    const unsubEvents = eventService.subscribeAllEvents(
      (data) => setEventsList(data),
      (err) => console.error("Error subscribing to events:", err)
    );

    const unsubUsers = userService.subscribeUsers(
      (data) => setUsersList(data),
      (err) => console.error("Error subscribing to users:", err)
    );

    return () => {
      unsubEvents();
      unsubUsers();
    };
  }, []);

  const [sortAsc, setSortAsc] = useState(false);

  const departments = [
    "All",
    "Computer Science (CSE)",
    "AI & Machine Learning (AI & ML)",
    "Information Technology (IT)",
    "Cyber Security (CS)",
    "Electronics (ECE)"
  ];

  const years = ["All", "1st Year", "2nd Year", "3rd Year", "4th Year"];
  const statuses = ["All", "Confirmed", "Waitlist", "Cancelled"];

  // Selected Event Object
  const currentEvent = eventsList.find((e) => e.id === selectedEventId);

  // Filtered Event Registrations
  const filteredRegs = regs
    .filter((r) => {
      const matchNotDeleted = !r.isDeleted && !(r as any).deleted;
      const matchEvent = selectedEventId === "all" || r.eventId === selectedEventId;
      const matchDept = deptFilter === "All" || (r.department || "").includes(deptFilter);
      const matchYear = yearFilter === "All" || r.year === yearFilter;
      const matchStatus = statusFilter === "All" || r.status === statusFilter;
      const participantName = r.name || (r as any).studentName || "";
      const matchSearch =
        participantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.eventName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.registrationNumber ?? r.registrationId ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchNotDeleted && matchEvent && matchDept && matchYear && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      const nameA = a.name || (a as any).studentName || "";
      const nameB = b.name || (b as any).studentName || "";
      if (sortField === "name") comparison = nameA.localeCompare(nameB);
      else if (sortField === "status") comparison = (a.status || "").localeCompare(b.status || "");
      else comparison = (a.registeredDate || (a as any).createdAt || "").localeCompare(b.registeredDate || (b as any).createdAt || "");
      return sortAsc ? comparison : -comparison;
    });

  useEffect(() => {
    console.log(`[Pipeline Audit] STEP 13: Admin Dashboard filtered registrations | registrationId: "N/A" | eventId: "${selectedEventId}" | userId: "ADMIN" | count: ${filteredRegs.length}`);
  }, [filteredRegs.length, selectedEventId]);

  // Filtered Website Sign-ups
  const filteredUsers = usersList.filter((u) => {
    const matchDept = deptFilter === "All" || (u.department || "").includes(deptFilter);
    const matchYear = yearFilter === "All" || u.year === yearFilter;
    const matchSearch =
      (u.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchYear && matchSearch;
  });

  const toggleAttendance = (id: string) => {
    setRegs((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextAtt = r.attendance === "Attended" ? "Absent" : "Attended";
          return { ...r, attendance: nextAtt };
        }
        return r;
      })
    );
  };

  const handleDeleteRegistration = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this event?`)) return;
    try {
      await registrationService.deleteRegistration(id);
      // Remove locally to optimistic update
      setRegs(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      console.error("Failed to delete", err);
      alert(err.message || "Failed to remove participant.");
    }
  };

  const handleExportCSV = () => {
    if (mainViewMode === "events") exportToCSV(filteredRegs, "event_registrations");
    else exportToCSV(filteredUsers, "website_signups");
  };

  const handleExportExcel = () => {
    if (mainViewMode === "events") exportToExcel(filteredRegs, "event_registrations");
    else exportToExcel(filteredUsers, "website_signups");
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
      {/* Top Header & Main Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-500" />
            Registrations & Website Sign-Ups Portal
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Click on any event block to view registered participants, or switch to Website Sign-Ups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Mode Switcher Tabs */}
          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setMainViewMode("events")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mainViewMode === "events"
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Calendar className="w-4 h-4" />
              Event Blocks
            </button>
            <button
              onClick={() => setMainViewMode("signups")}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                mainViewMode === "signups"
                  ? "bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <UserPlus className="w-4 h-4" />
              Website Sign-Ups
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {canImport && mainViewMode === "events" && currentEvent && (
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                Import CSV
              </button>
            )}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: EVENT REGISTRATION BLOCKS */}
      {mainViewMode === "events" && (
        <div className="space-y-6">
          {/* Event Cards / Blocks Header */}
          <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Select Event Block to View Participants:
              </h3>
              {selectedEventId !== "all" && (
                <button
                  onClick={() => setSelectedEventId("all")}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Show All Events ({regs.filter(r => !r.isDeleted).length} Regs)
                </button>
              )}
            </div>

            {/* Event Blocks Horizontal Scrollable Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Block 0: All Events Overview Block */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => setSelectedEventId("all")}
                className={cn(
                  "p-4 rounded-2xl glass-card transition-all cursor-pointer border relative overflow-hidden flex flex-col justify-between",
                  selectedEventId === "all"
                    ? "ring-2 ring-blue-600 dark:ring-blue-400 border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-lg"
                    : "border-gray-200/60 dark:border-gray-800/60 hover:border-blue-300 dark:hover:border-blue-700"
                )}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      All Events
                    </span>
                    <FileCheck className="w-4 h-4 text-blue-500" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-base">Total Registrations</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cumulative event signups</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
                  <span className="text-xl font-extrabold font-display text-blue-600 dark:text-blue-400">
                    {regs.filter(r =>
                      !r.isDeleted &&
                      (r.status as string) !== "CANCELLED" &&
                      (r.status as string) !== "Cancelled" &&
                      (r.status as string) !== "cancelled"
                    ).length}
                  </span>
                  <span className="text-[11px] font-semibold text-gray-500">Confirmed Participants</span>
                </div>
              </motion.div>

              {/* Event Blocks for Each Event */}
              {eventsList.map((evt) => {
                const isSelected = selectedEventId === evt.id;
                const registeredCount = regs.filter(
                  (r) =>
                    !r.isDeleted &&
                    r.eventId === evt.id &&
                    (r.status as string) !== "CANCELLED" &&
                    (r.status as string) !== "Cancelled" &&
                    (r.status as string) !== "cancelled"
                ).length;
                const cancelledCount = regs.filter(
                  (r) =>
                    !r.isDeleted &&
                    r.eventId === evt.id &&
                    ((r.status as string) === "CANCELLED" || (r.status as string) === "Cancelled" || (r.status as string) === "cancelled")
                ).length;
                const regPercentage = Math.min(100, Math.round((registeredCount / (evt.capacity || 1)) * 100));

                return (
                  <motion.div
                    key={evt.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={cn(
                      "p-4 rounded-2xl glass-card transition-all cursor-pointer border relative overflow-hidden flex flex-col justify-between group",
                      isSelected
                        ? "ring-2 ring-blue-600 dark:ring-blue-400 border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-lg"
                        : "border-gray-200/60 dark:border-gray-800/60 hover:border-blue-300 dark:hover:border-blue-700"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            evt.type === "Campus"
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          )}
                        >
                          {evt.category}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                            evt.status === "Published"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                        >
                          {evt.status}
                        </span>
                      </div>

                      <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {evt.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                        {evt.date} • {evt.venue}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-800/60">
                      <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                        <span className="text-gray-500">Confirmed</span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {registeredCount} / {evt.capacity}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${regPercentage}%` }}
                        />
                      </div>
                      {cancelledCount > 0 && (
                        <p className="text-[10px] text-rose-500 font-semibold mt-1">
                          {cancelledCount} cancelled
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

          {/* Active Event Banner Indicator */}
          {currentEvent && (
            <div className="p-4 rounded-2xl bg-blue-600 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-blue-500/15">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                    Selected Event Filter
                  </span>
                  <span className="text-xs font-medium">{currentEvent.category}</span>
                </div>
                <h3 className="text-lg font-bold font-display mt-1">{currentEvent.title}</h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Venue: {currentEvent.venue} • Date: {currentEvent.date} ({currentEvent.time})
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right mr-4">
                    <span className="text-xl font-extrabold">
                      {regs.filter(r =>
                        !r.isDeleted &&
                        r.eventId === currentEvent.id &&
                        (r.status as string) !== "CANCELLED" &&
                        (r.status as string) !== "Cancelled" &&
                        (r.status as string) !== "cancelled"
                      ).length} / {currentEvent.capacity}
                    </span>
                    <p className="text-[10px] text-blue-200">Confirmed Seats</p>
                  </div>
                {canManageParticipants && (
                  <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-xs transition-colors shadow-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Participant
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search participant name or email..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="All">All Departments</option>
              {departments.slice(1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="All">All Academic Years</option>
              {years.slice(1).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none"
            >
              <option value="All">All Registration Statuses</option>
              {statuses.slice(1).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Event Participant Registrations Table */}
          <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60 select-none">
                  <tr>
                    <th
                      className="p-4 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                      onClick={() => {
                        setSortField("name");
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Participant Name</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-4">Department & Year</th>
                    <th className="p-4">Registered Event</th>
                    <th
                      className="p-4 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                      onClick={() => {
                        setSortField("date");
                        setSortAsc(!sortAsc);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Registered Timestamp</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-4">Attendance Check-in</th>
                    <th className="p-4">Status</th>
                    {canManageParticipants && <th className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredRegs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No registrations found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRegs.map((r) => {
                      const matchedUser = usersList.find(
                        (u) => (r.userId && u.id === r.userId) || (r.email && u.email?.toLowerCase().trim() === r.email?.toLowerCase().trim())
                      );
                      const participantName = r.studentName || r.name || matchedUser?.name || (r.email ? r.email.split("@")[0] : "Participant");
                      const participantEmail = r.email || matchedUser?.email || "N/A";
                      const participantDept = r.department || matchedUser?.department || "";
                      const participantYear = r.year || matchedUser?.year || "";
                      const rawTimestamp = (r as any).registeredAt || r.registeredDate || (r as any).createdAt;
                      const displayDate = rawTimestamp
                        ? (isNaN(Date.parse(rawTimestamp)) ? rawTimestamp : new Date(rawTimestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }))
                        : "Just now";

                        const isCancelled = (r.status as string) === "CANCELLED" || (r.status as string) === "Cancelled" || (r.status as string) === "cancelled";
                      return (
                        <tr key={r.id} className={`transition-colors ${isCancelled ? "bg-rose-50/40 dark:bg-rose-950/10 opacity-70" : "hover:bg-blue-50/30 dark:hover:bg-blue-950/20"}`}>
                          <td className="p-4 font-bold text-gray-900 dark:text-white">
                            <div>
                              <p className="font-bold flex items-center gap-1.5">
                                {r.userDeleted || (r as any).displayName === "Deleted User" ? (
                                  <span className="text-gray-500 italic flex items-center gap-1">
                                    Deleted User
                                    <span className="text-[10px] not-italic px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                                      Account Deleted
                                    </span>
                                  </span>
                                ) : (
                                  participantName
                                )}
                              </p>
                              <p className="text-[11px] text-gray-400 font-normal">{r.userDeleted ? "deleted-user@anonymized" : participantEmail}</p>
                            </div>
                          </td>
                          <td className="p-4 text-gray-600 dark:text-gray-400">
                            {participantDept || participantYear ? (
                              <>
                                {participantDept && <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{participantDept}</p>}
                                {participantYear && <p className="text-[10px] text-gray-400">{participantYear}</p>}
                              </>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="p-4 font-medium text-blue-600 dark:text-blue-400 max-w-xs truncate">
                            {r.eventName || r.eventSnapshot?.title || "Tech Event"}
                          </td>
                          <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{displayDate}</td>

                        <td className="p-4">
                          <button
                            onClick={() => toggleAttendance(r.id)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                              r.attendance === "Attended"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : r.attendance === "Absent"
                                ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            )}
                            title="Toggle check-in status"
                          >
                            {r.attendance === "Attended" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            ) : r.attendance === "Absent" ? (
                              <XCircle className="w-3.5 h-3.5 text-red-500" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span>{r.attendance}</span>
                          </button>
                        </td>

                        <td className="p-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                              ((r.status as string) === "Confirmed" || (r.status as string) === "CONFIRMED")
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : (r.status as string) === "Waitlist"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : ((r.status as string) === "CANCELLED" || (r.status as string) === "Cancelled" || (r.status as string) === "cancelled")
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : "bg-gray-500/10 text-gray-500 border-gray-500/20"
                            )}
                          >
                            {((r.status as string) === "CANCELLED" || (r.status as string) === "Cancelled") ? "❌ Cancelled" : r.status}
                          </span>
                        </td>
                        {canManageParticipants && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleDeleteRegistration(r.id, r.name)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Remove Participant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: WEBSITE ACCOUNT SIGN-UPS BLOCK */}
      {mainViewMode === "signups" && (
        <div className="space-y-6">
          {/* Website Sign-Ups Overview Banner Block */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-2">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Platform Accounts</span>
                </div>
                <h3 className="text-2xl font-display font-bold">Registered Website Accounts</h3>
                <p className="text-indigo-100 text-xs mt-1">
                  All students and members who signed up via Google OAuth or Email & Password on the website.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-center">
                  <span className="text-2xl font-extrabold block">{usersList.length}</span>
                  <span className="text-[10px] uppercase font-semibold">Total Accounts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Dept Filters for Sign-Ups */}
          <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search registered user name or email..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none"
              >
                <option value="All">All Departments</option>
                {departments.slice(1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Website Sign-Ups Table */}
          <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60">
                  <tr>
                    <th className="p-4">User Account</th>
                    <th className="p-4">Sign-Up Method</th>
                    <th className="p-4">Department & Year</th>
                    <th className="p-4">Joined Date</th>
                    <th className="p-4">Events Attended</th>
                    <th className="p-4">Account Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No user accounts found matching the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((usr) => (
                      <tr key={usr.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            <img src={usr.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                            <div>
                              <p className="font-bold">{usr.name}</p>
                              <p className="text-[11px] text-gray-400 font-normal">{usr.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {usr.signupMethod === "Google OAuth" ? (
                              <Globe className="w-3 h-3 text-indigo-500" />
                            ) : (
                              <Mail className="w-3 h-3 text-indigo-500" />
                            )}
                            {usr.signupMethod}
                          </span>
                        </td>

                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">{usr.department}</p>
                          <p className="text-[10px] text-gray-400">{usr.year}</p>
                        </td>

                        <td className="p-4 text-gray-500 text-xs whitespace-nowrap">{usr.joinedDate}</td>

                        <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                          {usr.eventsAttended} Events
                        </td>

                        <td className="p-4">
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                              usr.status === "Active"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            )}
                          >
                            {usr.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Add Participant Modal */}
      <AddParticipantModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        currentEvent={currentEvent}
        usersList={usersList}
        onSuccess={(msg) => alert(msg)}
        onError={(msg) => alert(msg)}
      />

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentEvent={currentEvent}
        onSuccess={(msg) => alert(msg)}
      />
    </div>
  );
}
