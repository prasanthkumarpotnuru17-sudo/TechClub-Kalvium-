"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Moon,
  Sun,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  Calendar,
  Briefcase,
  FileSpreadsheet,
  UserPlus,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Check,
  MessageSquare
} from "lucide-react";
import { AdminTab } from "./Sidebar";
import { NotificationItem } from "@/lib/services/mockData";
import { apiService } from "@/lib/services/apiService";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  activeTab: AdminTab;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onMobileMenuOpen: () => void;
  onOpenQuickAction: (action: "create-event" | "add-opportunity" | "send-notification" | "add-team" | "export-registrations") => void;
  onSearchChange?: (query: string) => void;
  onSelectTab?: (tab: AdminTab) => void;
}

export function Header({
  activeTab,
  darkMode,
  setDarkMode,
  onMobileMenuOpen,
  onOpenQuickAction,
  onSearchChange,
  onSelectTab,
}: HeaderProps) {
  const { user, role, logout } = useAuth();
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const quickMenuRef = useRef<HTMLDivElement>(null);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (quickMenuRef.current && !quickMenuRef.current.contains(target)) {
        setShowQuickMenu(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(target)) {
        setShowNotifMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowQuickMenu(false);
        setShowNotifMenu(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Derive display values from live auth data
  const displayName = user?.name || user?.email?.split("@")[0] || "Admin";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.avatar || null;
  const displayRole =
    role === "super_admin"
      ? "Super Admin"
      : role === "admin"
      ? "Admin"
      : role === "coordinator"
      ? "Coordinator"
      : "Member";

  useEffect(() => {
    // Subscribe to recent activity_logs as notification feed
    const { subscribeRecentActivities } = require("@/services/activityLogService");
    const unsub = subscribeRecentActivities((logs: any[]) => {
      // Map activity logs to notification shape
      setNotifications(logs.map((l) => ({
        id: l.id,
        type: l.type,
        title: l.action,
        message: `${l.user} → ${l.target}`,
        sentAt: l.timestamp,
        readCount: 0,
        targetAudience: "Admin",
      } as NotificationItem)));
    }, 8);
    return () => unsub();
  }, []);

  const tabTitles: Record<AdminTab, string> = {
    dashboard: "Dashboard Overview",
    events: "Event Management",
    registrations: "Registrations & Attendees",
    payments: "Payment Verifications & Audit",
    members: "Member Management",
    crew: "Our Crew & Leadership",
    attendance: "Attendance & QR Verification",
    certificates: "Certificates & Digital Credentials",
    announcements: "Announcements & Broadcasts",
    community_chat: "Community Chat & Tasks",
    contact_messages: "Contact Messages & Inquiries",
    analytics: "Interactive Analytics",
    reports: "Executive Reports & Audit Center",
    settings: "Platform & Integration Settings",
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearchChange) onSearchChange(val);
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between h-16 px-4 md:px-6 border-b bg-[var(--header-bg)] backdrop-blur-xl border-gray-200/60 dark:border-gray-800/60 transition-colors">
      {/* Left: Mobile Menu & Section Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="font-display font-bold text-gray-900 dark:text-white text-lg md:text-xl tracking-tight">
            {tabTitles[activeTab]}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
            Tech Club Management Platform • Kalvium Edition
          </p>
        </div>
      </div>

      {/* Center/Right Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Global Search Bar */}
        <div className="relative hidden lg:block w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search events, members, regs..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-100/80 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-full text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Quick Actions Dropdown Button */}
        <div className="relative" ref={quickMenuRef}>
          <button
            onClick={() => {
              setShowQuickMenu(!showQuickMenu);
              setShowNotifMenu(false);
              setShowProfileMenu(false);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Action</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          <AnimatePresence>
            {showQuickMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 glass-card"
              >
                <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Admin Actions
                </div>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickAction("create-event");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors"
                >
                  <Calendar className="w-4 h-4 mr-2.5 text-blue-500" />
                  Create Event
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickAction("add-opportunity");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-purple-950/60 hover:text-purple-600 dark:hover:text-purple-400 rounded-xl transition-colors"
                >
                  <Briefcase className="w-4 h-4 mr-2.5 text-purple-500" />
                  Add Opportunity
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickAction("send-notification");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl transition-colors"
                >
                  <Bell className="w-4 h-4 mr-2.5 text-amber-500" />
                  Send Notification
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickAction("export-registrations");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2.5 text-emerald-500" />
                  Export Registrations
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    onOpenQuickAction("add-team");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors"
                >
                  <UserPlus className="w-4 h-4 mr-2.5 text-indigo-500" />
                  Add Team Member
                </button>
                <button
                  onClick={() => {
                    setShowQuickMenu(false);
                    if (onSelectTab) onSelectTab("community_chat");
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-400 rounded-xl transition-colors"
                >
                  <MessageSquare className="w-4 h-4 mr-2.5 text-sky-500" />
                  Community Chat & Tasks
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Community Chat Message Icon */}
        <button
          onClick={() => {
            setShowQuickMenu(false);
            setShowNotifMenu(false);
            setShowProfileMenu(false);
            if (onSelectTab) onSelectTab("community_chat");
          }}
          className={cn(
            "relative p-2 rounded-xl transition-colors cursor-pointer group",
            activeTab === "community_chat"
              ? "bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
              : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
          title="Open Community Chat & Live Messages"
          aria-label="Community Chat & Messages"
        >
          <MessageSquare className="w-5 h-5 transition-transform group-hover:scale-105" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifMenuRef}>
          <button
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowQuickMenu(false);
              setShowProfileMenu(false);
            }}
            className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <AnimatePresence>
            {showNotifMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 md:w-96 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 glass-card"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Notifications
                  </span>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    Mark all read
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No recent notifications.</p>
                  ) : (
                    notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {n.type}
                        </span>
                        <span className="text-[10px] text-gray-400">{n.sentAt}</span>
                      </div>
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
                        {n.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                    </div>
                  ))
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600" />
          )}
        </button>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowQuickMenu(false);
              setShowNotifMenu(false);
            }}
            className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full ring-2 ring-blue-500/30 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden xl:flex flex-col text-left leading-none">
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {displayName}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{displayRole}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-60 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl z-50 glass-card"
              >
                {/* Profile card header */}
                <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 mb-1 flex items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/20 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full ring-2 ring-blue-500/20 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{displayName}</p>
                    <p className="text-[11px] text-gray-500 truncate">{displayEmail}</p>
                    <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {displayRole}
                    </span>
                  </div>
                </div>
                <a
                  href="/"
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-gray-400" />
                  View Public Website
                </a>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex items-center w-full px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors mt-1"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
