"use client";

import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Download,
  FileText,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { exportToCSV, exportToExcel } from "@/lib/services/exportUtils";
import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { userService } from "@/services/userService";
import { motion } from "framer-motion";

export function ReportsView() {
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [liveRegistrations, setLiveRegistrations] = useState<any[]>([]);
  const [liveUsers, setLiveUsers] = useState<any[]>([]);

  const { registrations: liveRegs } = useAdminRegistrations();

  useEffect(() => {
    setLiveRegistrations(liveRegs);
  }, [liveRegs]);

  useEffect(() => {
    const unsubEvents = eventService.subscribeAllEvents((evts) => setLiveEvents(evts));
    const unsubUsers = userService.subscribeUsers((users) => setLiveUsers(users));
    return () => { unsubEvents(); unsubUsers(); };
  }, []);

  const reportsList = [
    {
      id: "rep-1",
      title: "Comprehensive Attendance Audit Report",
      description: "Includes detailed verified check-in breakdown across all campus workshops and hackathons.",
      category: "Attendance",
      type: "CSV / Excel",
      data: liveRegistrations,
    },
    {
      id: "rep-2",
      title: "Annual Event Performance & Reach Report",
      description: "Registration count, capacity utilization, organizer metrics, and event status summaries.",
      category: "Events",
      type: "Excel / PDF",
      data: liveEvents,
    },
    {
      id: "rep-3",
      title: "Member Demographics & Department Breakdown",
      description: "Engineering branch distribution, student year metrics, and active member status logs.",
      category: "Demographics",
      type: "CSV",
      data: liveUsers,
    },
  ];

  const handleDownloadReport = (rep: typeof reportsList[0], format: "csv" | "excel") => {
    setGeneratingReport(rep.id);
    setTimeout(() => {
      if (format === "csv") exportToCSV(rep.data as any[], rep.title.toLowerCase().replace(/\s+/g, "_"));
      else exportToExcel(rep.data as any[], rep.title.toLowerCase().replace(/\s+/g, "_"));
      setGeneratingReport(null);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            Executive Reports & Export Audit Center
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Generate custom data exports, attendance audits, and domain performance reports.
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportsList.map((rep) => (
          <motion.div
            key={rep.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {rep.category}
                </span>
                <span className="text-[10px] font-semibold text-gray-400">{rep.type}</span>
              </div>

              <h3 className="font-bold text-gray-900 dark:text-white text-base">{rep.title}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{rep.description}</p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleDownloadReport(rep, "csv")}
                disabled={generatingReport === rep.id}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs rounded-xl transition-all border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                CSV
              </button>

              <button
                onClick={() => handleDownloadReport(rep, "excel")}
                disabled={generatingReport === rep.id}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Excel (.xls)
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
