"use client";

import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Calendar,
  Filter,
  Users,
  Sparkles,
  ArrowUpRight,
  Download
} from "lucide-react";
import { RegistrationItem } from "@/lib/services/mockData";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { eventService } from "@/services/eventService";
import { notificationService } from "@/services/notificationService";
import { exportToCSV } from "@/lib/services/exportUtils";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function AttendanceView() {
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [eventNames, setEventNames] = useState<string[]>(["All Events"]);
  const [selectedEvent, setSelectedEvent] = useState<string>("All Events");
  const [searchQuery, setSearchQuery] = useState("");
  const [attendanceFilter, setAttendanceFilter] = useState<string>("All");
  const [isScanningQR, setIsScanningQR] = useState(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { registrations: liveRegs, loading: adminRegsLoading } = useAdminRegistrations();

  useEffect(() => {
    setRegistrations(liveRegs as unknown as RegistrationItem[]);
    setLoading(false);
  }, [liveRegs]);

  useEffect(() => {
    setError(null);
    const unsubEvents = eventService.subscribeAllEvents(
      (evts) => {
        setEventNames(["All Events", ...evts.map((e) => e.title)]);
      },
      (err) => console.error("Error subscribing to events:", err)
    );
    return () => {
      unsubEvents();
    };
  }, []);

  const events = eventNames;

  const validRegistrations = registrations.filter((r) => !r.isDeleted);

  const filtered = validRegistrations.filter((r) => {
    const matchesEvt = selectedEvent === "All Events" || r.eventName === selectedEvent;
    const matchesAtt = attendanceFilter === "All" || r.attendance === attendanceFilter;
    const matchesSearch =
      (r.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesEvt && matchesAtt && matchesSearch;
  });

  const attendedCount = validRegistrations.filter((r) => r.attendance === "Attended").length;
  const absentCount = validRegistrations.filter((r) => r.attendance === "Absent").length;
  const pendingCount = validRegistrations.filter((r) => r.attendance === "Pending").length;
  const attendanceRate = Math.round((attendedCount / (validRegistrations.length || 1)) * 100) || 0;

  const toggleAttendance = async (id: string, status: "Attended" | "Absent" | "Pending") => {
    await registrationService.updateAttendance(id, status);
    if (status === "Attended") {
      const reg = registrations.find((r) => r.id === id);
      if (reg && reg.email) {
        notificationService.sendAttendanceConfirmation({
          userId: (reg as any).userId || id,
          email: reg.email,
          name: reg.name,
          eventName: reg.eventName || "Tech Club Event",
          eventDate: new Date().toLocaleDateString()
        }).catch((err) => {
          console.warn("[AttendanceView] Failed to dispatch attendance notification:", err);
        });
      }
    }
  };


  const handleSimulateQRScan = () => {
    setIsScanningQR(true);
    setTimeout(() => {
      // Pick a pending/absent student to mark present
      const pendingReg = registrations.find((r) => r.attendance !== "Attended");
      if (pendingReg) {
        toggleAttendance(pendingReg.id, "Attended");
        setScanSuccessMessage(`Verified Check-in: ${pendingReg.name} (${pendingReg.department})`);
      } else {
        setScanSuccessMessage("Verified Check-in: Rohan Verma (CSE)");
      }
      setIsScanningQR(false);
      setTimeout(() => setScanSuccessMessage(null), 3000);
    }, 1500);
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
      {/* Top Banner & Quick Check-in Console */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-500" />
            Attendance Tracking & Verification
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time event check-ins, QR scanner verification, and attendance audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateQRScan}
            disabled={isScanningQR}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            <QrCode className="w-4 h-4" />
            {isScanningQR ? "Scanning QR Code..." : "Simulate QR Scan"}
          </button>
          <button
            onClick={() => exportToCSV(filtered, "attendance_report")}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs rounded-xl transition-all border border-gray-200 dark:border-gray-700 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Export Log
          </button>
        </div>
      </div>

      {/* QR Success Toast */}
      {scanSuccessMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          {scanSuccessMessage}
        </motion.div>
      )}

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">Attendance Percentage</p>
          <h3 className="text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
            {attendanceRate}%
          </h3>
          <span className="text-[10px] text-gray-400">Verified event participation</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">Verified Attended</p>
          <h3 className="text-2xl font-bold font-display text-blue-600 dark:text-blue-400 mt-1">
            {attendedCount} Students
          </h3>
          <span className="text-[10px] text-gray-400">Present at venue</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending Check-ins</p>
          <h3 className="text-2xl font-bold font-display text-amber-600 dark:text-amber-400 mt-1">
            {pendingCount} Students
          </h3>
          <span className="text-[10px] text-gray-400">Awaiting QR scan</span>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <p className="text-xs text-gray-500 dark:text-gray-400">Absentees</p>
          <h3 className="text-2xl font-bold font-display text-red-600 dark:text-red-400 mt-1">
            {absentCount} Students
          </h3>
          <span className="text-[10px] text-gray-400">Did not check in</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, email, dept..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Event Filter */}
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none max-w-xs truncate"
          >
            {events.map((evt) => (
              <option key={evt} value={evt}>
                {evt}
              </option>
            ))}
          </select>

          {/* Attendance Filter */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {["All", "Attended", "Pending", "Absent"].map((st) => (
              <button
                key={st}
                onClick={() => setAttendanceFilter(st)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                  attendanceFilter === st
                    ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60">
              <tr>
                <th className="p-4">Student Name</th>
                <th className="p-4">Department & Year</th>
                <th className="p-4">Event Title</th>
                <th className="p-4">Check-in Status</th>
                <th className="p-4 text-right">Quick Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No registrations found matching the filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      <div>
                        <p className="font-bold">{r.name}</p>
                        <p className="text-[11px] text-gray-400 font-normal">{r.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {r.department || r.year ? (
                        <>
                          {r.department && <p className="font-semibold text-xs text-gray-800 dark:text-gray-200">{r.department}</p>}
                          {r.year && <p className="text-[10px] text-gray-400">{r.year}</p>}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 font-medium text-blue-600 dark:text-blue-400 max-w-xs truncate">
                      {r.eventName}
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                          r.attendance === "Attended"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : r.attendance === "Absent"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {r.attendance === "Attended" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : r.attendance === "Absent" ? (
                          <XCircle className="w-3 h-3 text-red-500" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-500" />
                        )}
                        {r.attendance}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleAttendance(r.id, "Attended")}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 cursor-pointer"
                        >
                          Present
                        </button>
                        <button
                          onClick={() => toggleAttendance(r.id, "Absent")}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 cursor-pointer"
                        >
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
