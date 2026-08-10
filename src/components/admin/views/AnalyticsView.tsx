"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieChartIcon,
  Activity,
  Layers,
  Calendar,
  Users,
  FileCheck,
  Briefcase
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { userService } from "@/services/userService";
import { EventItem, RegistrationItem, UserItem } from "@/lib/services/mockData";
import { motion } from "framer-motion";

export function AnalyticsView() {
  const [activeCategory, setActiveCategory] = useState<"all" | "events" | "members" | "registrations" | "opportunities">("all");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { registrations: liveRegs } = useAdminRegistrations();

  useEffect(() => {
    setRegistrations(liveRegs as unknown as RegistrationItem[]);
  }, [liveRegs]);

  useEffect(() => {
    setLoading(true);
    const unsubEvents = eventService.subscribeAllEvents(
      (data) => setEvents(data),
      (err) => {
        console.error(err);
        setError("Missing or insufficient permissions for analytics.");
      }
    );
    const unsubUsers = userService.subscribeUsers(
      (data) => {
        setUsers(data);
        setLoading(false);
      },
      (err) => console.error(err)
    );

    return () => {
      unsubEvents();
      unsubUsers();
    };
  }, []);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const getMonthName = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length >= 2) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        return monthNames[monthIdx];
      }
    }
    return null;
  };

  // 1. Events conducted per month
  const monthlyMap: Record<string, { campus: number; external: number; total: number }> = {};
  monthNames.forEach((m) => {
    monthlyMap[m] = { campus: 0, external: 0, total: 0 };
  });

  events.forEach((e) => {
    const mName = getMonthName(e.date);
    if (mName && monthlyMap[mName]) {
      if (e.type === "Campus") monthlyMap[mName].campus += 1;
      else monthlyMap[mName].external += 1;
      monthlyMap[mName].total += 1;
    }
  });

  const mockEventsMonthly = monthNames.map((m) => ({
    month: m,
    campus: monthlyMap[m].campus,
    external: monthlyMap[m].external,
    total: monthlyMap[m].total,
  })).filter((d) => d.total > 0 || ["Jun", "Jul", "Aug"].includes(d.month));

  // 2. Categories
  const categoryCount: Record<string, number> = {};
  events.forEach((e) => {
    const cat = e.category || "Web Dev";
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const colors = ["#3B82F6", "#6366F1", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6"];
  const mockEventCategories = Object.keys(categoryCount).length > 0
    ? Object.keys(categoryCount).map((name, idx) => ({
        name,
        value: categoryCount[name],
        color: colors[idx % colors.length],
      }))
    : [{ name: "No Data", value: 1, color: "#64748B" }];

  // 3. Registration Trends
  const trendMap: Record<string, { regs: number; checkIns: number }> = {};
  registrations.forEach((r) => {
    const rawDate = r.registeredDate || "TBD";
    let formatted = rawDate;
    try {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        formatted = parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    } catch (_) {}

    if (!trendMap[formatted]) {
      trendMap[formatted] = { regs: 0, checkIns: 0 };
    }
    trendMap[formatted].regs += 1;
    if (r.attendance === "Attended") {
      trendMap[formatted].checkIns += 1;
    }
  });

  const mockRegistrationTrends = Object.keys(trendMap).length > 0
    ? Object.keys(trendMap).map((date) => ({
        week: date,
        registrations: trendMap[date].regs,
        checkIns: trendMap[date].checkIns,
      })).slice(-7)
    : [{ week: "No Data", registrations: 0, checkIns: 0 }];

  // 4. Department Distribution
  const deptMap: Record<string, number> = {};
  users.forEach((u) => {
    const d = u.department || "Computer Science";
    deptMap[d] = (deptMap[d] || 0) + 1;
  });
  const mockDepartmentDistribution = Object.keys(deptMap).length > 0
    ? Object.keys(deptMap).map((dept) => ({
        department: dept,
        count: deptMap[dept],
      }))
    : [{ department: "No Data", count: 0 }];

  // 5. Year Distribution
  const yearMap: Record<string, number> = {};
  users.forEach((u) => {
    const y = u.year || "2nd Year";
    yearMap[y] = (yearMap[y] || 0) + 1;
  });
  const yearColors = ["#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#10B981"];
  const mockYearDistribution = Object.keys(yearMap).length > 0
    ? Object.keys(yearMap).map((year, idx) => ({
        year,
        value: yearMap[year],
        fill: yearColors[idx % yearColors.length],
      }))
    : [{ year: "No Data", value: 1, fill: "#64748B" }];

  // 6. Registration Status breakdown
  const regStatusMap: Record<string, number> = { Confirmed: 0, Waitlist: 0, Cancelled: 0 };
  registrations.forEach((r) => {
    const s = r.status || "Confirmed";
    regStatusMap[s] = (regStatusMap[s] || 0) + 1;
  });
  const statusColors = { Confirmed: "#10B981", Waitlist: "#F59E0B", Cancelled: "#EF4444" };
  const mockRegistrationStatusBreakdown = [
    { status: "Confirmed / Confirmed", value: regStatusMap.Confirmed, color: statusColors.Confirmed },
    { status: "Waiting List", value: regStatusMap.Waitlist, color: statusColors.Waitlist },
    { status: "Cancelled", value: regStatusMap.Cancelled, color: statusColors.Cancelled },
  ];

  // 7. Opportunity Distribution (empty or 0s)
  const mockOpportunityDistribution = [
    { type: "Campus Events", value: events.filter(e => e.type === "Campus").length, fill: "#2563EB" },
    { type: "External Events", value: events.filter(e => e.type === "External").length, fill: "#7C3AED" },
    { type: "Online Mode", value: 0, fill: "#059669" },
    { type: "Offline Mode", value: 0, fill: "#D97706" }
  ];

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
      {/* Header & Category Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Interactive Analytics & Growth Metrics
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time visual charts for events, registrations, demographics, and opportunities.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Charts" },
            { id: "events", label: "Event Analytics" },
            { id: "members", label: "Member Analytics" },
            { id: "registrations", label: "Registrations" },
            { id: "opportunities", label: "Opportunities" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Event Monthly Trends & Category Breakdown */}
      {(activeCategory === "all" || activeCategory === "events") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events Conducted Per Month (Area/Bar) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Events Conducted Per Month
                </h3>
                <p className="text-xs text-gray-500">Campus vs External Event breakdown</p>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockEventsMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCampus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExternal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="campus" name="Campus Events" stroke="#3B82F6" fillOpacity={1} fill="url(#colorCampus)" />
                  <Area type="monotone" dataKey="external" name="External Events" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorExternal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Event Categories Pie/Donut Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between"
          >
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2 mb-1">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                Event Categories
              </h3>
              <p className="text-xs text-gray-500">Distribution across tech domains</p>
            </div>

            <div className="h-60 w-full relative my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockEventCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {mockEventCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {mockEventCategories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-gray-600 dark:text-gray-400 text-[11px] truncate">{cat.name} ({cat.value}%)</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Row 2: Registration Trends & Department Distribution */}
      {(activeCategory === "all" || activeCategory === "registrations" || activeCategory === "members") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registration Trends Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Registration & Attendance Trends
                </h3>
                <p className="text-xs text-gray-500">Weekly cumulative registrations vs verified check-ins</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockRegistrationTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="week" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="registrations" name="Total Registrations" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="checkIns" name="Verified Check-ins" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Department-wise Members Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Department-wise Member Distribution
                </h3>
                <p className="text-xs text-gray-500">Student enrollment by engineering branch</p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockDepartmentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", border: "none", color: "#FFF", fontSize: "12px" }} />
                  <Bar dataKey="count" name="Enrolled Members" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {/* Row 3: Year-wise Demographics & Opportunity Distribution */}
      {(activeCategory === "all" || activeCategory === "opportunities" || activeCategory === "members") && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Year-wise Members */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">Year-wise Members</h3>
            <p className="text-xs text-gray-500 mb-2">1st Year to 4th Year breakdown</p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockYearDistribution} cx="50%" cy="50%" outerRadius={70} dataKey="value" label>
                    {mockYearDistribution.map((entry, index) => (
                      <Cell key={`cell-year-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Registration Status Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">Registration Status</h3>
            <p className="text-xs text-gray-500 mb-2">Confirmed vs Waitlist vs Cancelled</p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mockRegistrationStatusBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                    {mockRegistrationStatusBreakdown.map((entry, index) => (
                      <Cell key={`cell-status-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Opportunity Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 rounded-3xl border border-gray-200/60 dark:border-gray-800/60"
          >
            <h3 className="font-bold text-gray-900 dark:text-white text-base mb-1">Opportunity Types</h3>
            <p className="text-xs text-gray-500 mb-2">Campus vs External vs Mode</p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockOpportunityDistribution} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} />
                  <YAxis type="category" dataKey="type" stroke="#94A3B8" fontSize={10} width={90} />
                  <Tooltip contentStyle={{ backgroundColor: "#0F172A", borderRadius: "12px", color: "#FFF", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#6366F1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
