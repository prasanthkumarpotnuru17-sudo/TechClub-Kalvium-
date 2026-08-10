"use client";

import React from "react";
import { X, Mail, Calendar, Award, CheckCircle, ShieldCheck, User } from "lucide-react";
import { UserItem } from "@/lib/services/mockData";
import { motion } from "framer-motion";

interface UserProfileModalProps {
  user: UserItem | null;
  onClose: () => void;
}

export function UserProfileModal({ user, onClose }: UserProfileModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-md rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100 dark:border-gray-800">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/20 mb-3 shadow-lg"
          />
          <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
          <p className="text-xs text-gray-500">{user.email}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {user.role}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                user.status === "Active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}
            >
              {user.status}
            </span>
          </div>
        </div>

        <div className="py-4 space-y-3 text-xs md:text-sm">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Department</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.department}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Academic Year</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.year}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Member Since</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.joinedDate}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Events Attended</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">{user.eventsAttended} Verified Events</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
