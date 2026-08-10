"use client";

import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Award,
  TrendingUp,
  Layers,
  Sparkles,
  Calendar,
  ChevronRight,
  ShieldCheck,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import { mockClubStatus } from "@/lib/services/mockData";
import { motion } from "framer-motion";

export function ClubStatusView() {
  const [isActive, setIsActive] = useState(mockClubStatus.status === "Active");

  const memPercent = Math.round(
    (mockClubStatus.membershipTarget.current / mockClubStatus.membershipTarget.target) * 100
  );
  const evtPercent = Math.round(
    (mockClubStatus.eventCompletionTarget.current / mockClubStatus.eventCompletionTarget.target) * 100
  );
  const actPercent = Math.round(
    (mockClubStatus.annualActivityTarget.current / mockClubStatus.annualActivityTarget.target) * 100
  );

  return (
    <div className="space-y-6">
      {/* Top Main Club Card */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-9 h-9" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900 dark:text-white">
                  {mockClubStatus.clubName}
                </h2>
                <button
                  onClick={() => setIsActive(!isActive)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer"
                  style={{
                    backgroundColor: isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                    color: isActive ? "#10B981" : "#EF4444",
                  }}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
                  {isActive ? "Active Operations" : "Inactive / Paused"}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Academic Year: <span className="font-semibold text-gray-800 dark:text-gray-200">{mockClubStatus.academicYear}</span> • Recognized Student Organization
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-blue-50/80 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/40">
              <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400">Growth Index</p>
              <p className="text-lg font-extrabold font-display text-gray-900 dark:text-white">{mockClubStatus.communityGrowth}</p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-800/40">
              <p className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">Active Members</p>
              <p className="text-lg font-extrabold font-display text-gray-900 dark:text-white">{mockClubStatus.activeMembers}</p>
            </div>
          </div>
        </div>

        {/* Club Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-6">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Faculty Lead</p>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate mt-0.5">{mockClubStatus.facultyCoordinator}</p>
            <p className="text-[10px] text-gray-400 truncate">{mockClubStatus.facultyDesignation}</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Student President</p>
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate mt-0.5">{mockClubStatus.studentPresident}</p>
            <p className="text-[10px] text-gray-400 truncate">{mockClubStatus.studentPresidentYear}</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Total Domains</p>
            <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">{mockClubStatus.totalDomains}</p>
            <p className="text-[10px] text-gray-400">Tech Divisions</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Workshops</p>
            <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{mockClubStatus.workshopsConducted}</p>
            <p className="text-[10px] text-gray-400">Conducted</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Hackathons</p>
            <p className="text-lg font-extrabold text-purple-600 dark:text-purple-400 mt-0.5">{mockClubStatus.hackathonsConducted}</p>
            <p className="text-[10px] text-gray-400">Organized</p>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-500">Industry Talks</p>
            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{mockClubStatus.industrySessions}</p>
            <p className="text-[10px] text-gray-400">Keynote Sessions</p>
          </div>
        </div>
      </div>

      {/* Progress Bars Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Membership Growth Target</span>
            <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{memPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${memPercent}%` }}
              transition={{ duration: 1 }}
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {mockClubStatus.membershipTarget.current} / {mockClubStatus.membershipTarget.target} verified members enrolled.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Event Completion Rate</span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">{evtPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${evtPercent}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {mockClubStatus.eventCompletionTarget.current} of {mockClubStatus.eventCompletionTarget.target} target events completed.
          </p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-900 dark:text-white">Annual Activity Target</span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{actPercent}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${actPercent}%` }}
              transition={{ duration: 1, delay: 0.4 }}
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
            />
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {mockClubStatus.annualActivityTarget.current} of {mockClubStatus.annualActivityTarget.target} milestones achieved.
          </p>
        </div>
      </div>

      {/* Activity & Milestone Timeline */}
      <div className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Club Activity & Milestone Timeline
        </h3>

        <div className="relative pl-6 space-y-6">
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-800" />

          {mockClubStatus.timeline.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative flex items-start gap-4 group"
            >
              <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-gray-900 border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center z-10 group-hover:scale-125 transition-transform">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
              </div>

              <div className="flex-1 p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{item.category}</span>
                  <span className="text-[11px] text-gray-400">{item.date}</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                <span
                  className="inline-block text-[10px] font-semibold mt-2 px-2 py-0.5 rounded-md border"
                  style={{
                    backgroundColor:
                      item.status === "Completed" ? "rgba(16, 185, 129, 0.1)" : "rgba(59, 130, 246, 0.1)",
                    color: item.status === "Completed" ? "#10B981" : "#3B82F6",
                    borderColor: item.status === "Completed" ? "rgba(16, 185, 129, 0.2)" : "rgba(59, 130, 246, 0.2)",
                  }}
                >
                  {item.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
