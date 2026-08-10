"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  User as UserIcon, LayoutDashboard, Calendar, Award, 
  Settings, LogOut, Sparkles, ChevronDown, Bell, Edit3, ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export function ProfileDropdown() {
  const { user, profileCompletion, role, participantType, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!user) return null;

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "PK";

  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "coordinator"].includes(normalizedRole);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Avatar Button on Main Website Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full border border-gray-200 bg-slate-50 hover:bg-slate-100 transition-all duration-200 cursor-pointer shadow-xs active:scale-97 group select-none"
        aria-label="User account menu"
      >
        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 mr-1 transition-transform duration-200 ${isOpen ? "rotate-180 text-slate-900" : ""}`} />
      </button>

      {/* Light Theme Dropdown Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-3 w-72 rounded-3xl bg-white/95 backdrop-blur-2xl border border-gray-200 shadow-xl z-50 overflow-hidden text-slate-900 divide-y divide-gray-100"
          >
            {/* 1. Profile Header */}
            <div className="p-4 space-y-3 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <h4 className="text-sm font-bold text-slate-950 truncate">{user.name}</h4>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>

              {/* Role Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                  {role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role === "coordinator" ? "Coordinator" : "Member"}
                </span>
                {participantType && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                    {participantType}
                  </span>
                )}
              </div>

              {/* Profile Completion Meter */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" /> Completion
                  </span>
                  <span className="text-blue-600 font-mono font-bold">{profileCompletion}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300" 
                    style={{ width: `${profileCompletion}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* 2. Menu Navigation Links */}
            <div className="p-2 space-y-0.5 text-xs font-semibold text-slate-700">
              
              {/* Admin Dashboard Option */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold transition-colors cursor-pointer group"
                >
                  <LayoutDashboard className="w-4 h-4 text-purple-600" />
                  <span>Admin Dashboard</span>
                </Link>
              )}

              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <UserIcon className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>Workspace Overview</span>
              </Link>

              <Link
                href="/profile/edit"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <Edit3 className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>Edit Profile Information</span>
              </Link>

              <Link
                href="/profile/events"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <Calendar className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>My Event Passes</span>
              </Link>

              <Link
                href="/profile/certificates"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <Award className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>My Certificates</span>
              </Link>

              <Link
                href="/profile/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <Bell className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>Notifications</span>
              </Link>

              <Link
                href="/profile/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-colors cursor-pointer group"
              >
                <Settings className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                <span>Account Settings</span>
              </Link>
            </div>

            {/* 3. Log Out Button */}
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
