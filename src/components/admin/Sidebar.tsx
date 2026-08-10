"use client";

import React from "react";
import {
  LayoutDashboard,
  Calendar,
  FileCheck,
  Users,
  UserCheck,
  Award,
  Bell,
  BarChart3,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { useAdminRegistrations } from "@/hooks/useAdminRegistrations";
import { userService } from "@/services/userService";
import { announcementService } from "@/services/announcementService";
import { contactMessageService } from "@/services/contactMessageService";
import { paymentService } from "@/services/paymentService";

export type AdminTab =
  | "dashboard"
  | "events"
  | "registrations"
  | "payments"
  | "members"
  | "crew"
  | "attendance"
  | "certificates"
  | "announcements"
  | "contact_messages"
  | "analytics"
  | "reports"
  | "settings";

interface SidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onMobileClose?: () => void;
}

export const navItems = [
  { id: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard, badge: null },
  { id: "events" as AdminTab, label: "Events", icon: Calendar, badge: "0 Active" },
  { id: "registrations" as AdminTab, label: "Registrations", icon: FileCheck, badge: "0" },
  { id: "payments" as AdminTab, label: "Payments", icon: CreditCard, badge: "0 Pending" },
  { id: "members" as AdminTab, label: "Members", icon: Users, badge: "0" },
  { id: "crew" as AdminTab, label: "Our Crew", icon: ShieldCheck, badge: null },
  { id: "attendance" as AdminTab, label: "Attendance", icon: UserCheck, badge: "Live" },
  { id: "certificates" as AdminTab, label: "Certificates", icon: Award, badge: null },
  { id: "announcements" as AdminTab, label: "Announcements", icon: Bell, badge: "0" },
  { id: "contact_messages" as AdminTab, label: "Contact Messages", icon: MessageSquare, badge: "0 New" },
  { id: "analytics" as AdminTab, label: "Analytics", icon: BarChart3, badge: null },
  { id: "reports" as AdminTab, label: "Reports", icon: FileSpreadsheet, badge: null },
  { id: "settings" as AdminTab, label: "Settings", icon: Settings, badge: null },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onMobileClose,
}: SidebarProps) {
  const [counts, setCounts] = React.useState({
    events: "0 Active",
    registrations: "0",
    payments: "0 Pending",
    members: "0",
    announcements: "0",
    contactMessages: "0 New",
  });

  const { registrations: liveRegs } = useAdminRegistrations();

  React.useEffect(() => {
    const activeCount = liveRegs.filter((r) => !r.isDeleted && r.status !== "CANCELLED" && (r.status as string) !== "Cancelled").length;
    const formatted = activeCount >= 1000 ? `${(activeCount / 1000).toFixed(1)}k` : `${activeCount}`;
    setCounts((prev) => ({ ...prev, registrations: formatted }));
  }, [liveRegs]);

  React.useEffect(() => {
    const unsubEvents = eventService.subscribeAllEvents((evts) => {
      const activeCount = evts.filter(e => e.status === "Published" || e.status === "Draft").length;
      setCounts(prev => ({ ...prev, events: `${activeCount} Active` }));
    });

    const unsubPayments = paymentService.subscribePayments((payList) => {
      const pendingCount = payList.filter(p => p.status === "Pending").length;
      setCounts(prev => ({ ...prev, payments: pendingCount > 0 ? `${pendingCount} Pending` : "0" }));
    });

    const unsubUsers = userService.subscribeUsers((users) => {
      const activeCount = users.length;
      const formatted = activeCount >= 1000 ? `${(activeCount / 1000).toFixed(1)}k` : `${activeCount}`;
      setCounts(prev => ({ ...prev, members: formatted }));
    });

    const unsubAnns = announcementService.subscribeAnnouncements((anns) => {
      setCounts(prev => ({ ...prev, announcements: `${anns.length}` }));
    });

    const unsubMsgs = contactMessageService.subscribeMessages((msgs) => {
      const unreadCount = msgs.filter((m) => !m.isRead && m.status !== "Archived").length;
      setCounts(prev => ({ ...prev, contactMessages: unreadCount > 0 ? `${unreadCount} New` : "0" }));
    });

    return () => {
      unsubEvents();
      unsubPayments();
      unsubUsers();
      unsubAnns();
      unsubMsgs();
    };
  }, []);

  const dynamicNavItems = navItems.map((item) => {
    let badge = item.badge;
    if (item.id === "events") badge = counts.events;
    if (item.id === "registrations") badge = counts.registrations;
    if (item.id === "payments") badge = counts.payments;
    if (item.id === "members") badge = counts.members;
    if (item.id === "announcements") badge = counts.announcements;
    if (item.id === "contact_messages") badge = counts.contactMessages;
    return { ...item, badge };
  });
  return (
    <aside
      className={cn(
        "relative z-30 flex flex-col h-screen border-r transition-all duration-300 select-none bg-[var(--sidebar-bg)] backdrop-blur-xl border-gray-200/60 dark:border-gray-800/60",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200/60 dark:border-gray-800/60">
        <button
          onClick={() => {
            setActiveTab("dashboard");
            if (onMobileClose) onMobileClose();
          }}
          className="flex items-center gap-3 overflow-hidden text-left cursor-pointer bg-transparent border-0 p-0 focus:outline-none"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col leading-none"
            >
              <span className="font-display font-bold text-gray-900 dark:text-white text-lg tracking-tight">
                Tech Club
              </span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
                Admin Console
              </span>
            </motion.div>
          )}
        </button>

        {/* Collapse Button (Desktop) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 cursor-pointer"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {dynamicNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (onMobileClose) onMobileClose();
              }}
              className={cn(
                "relative flex items-center w-full px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group cursor-pointer",
                isActive
                  ? "text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/50 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100/70 dark:hover:bg-gray-800/50"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-blue-600 dark:bg-blue-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}

              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
                )}
              />

              {!collapsed && (
                <span className="ml-3 truncate">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    item.badge === "Live"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Integration Status Footer Badge */}
      {!collapsed && (
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 border border-indigo-500/20 dark:border-indigo-500/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              Integrations Ready
            </span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">
            Firebase, n8n & Google Sheets mock layer active.
          </p>
        </div>
      )}
    </aside>
  );
}
