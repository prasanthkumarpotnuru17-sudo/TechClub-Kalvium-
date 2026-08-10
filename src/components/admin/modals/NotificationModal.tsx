"use client";

import React, { useState } from "react";
import { X, Send, Bell } from "lucide-react";
import { motion } from "framer-motion";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (notifData: any) => void;
  sentByName?: string;
}

export function NotificationModal({ isOpen, onClose, onSend, sentByName = "Admin" }: NotificationModalProps) {
  const [form, setForm] = useState({
    title: "",
    message: "",
    type: "New Event" as "New Event" | "Registration Closing" | "Club Announcement",
    targetAudience: "All Tech Club Members",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.message) return;
    onSend({ ...form, sentBy: sentByName });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" />
              New Announcement Broadcast
            </h3>
            <p className="text-xs text-gray-500">
              Send notifications and announcements to club members.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Registrations Closing for GenAI Summit"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Alert Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="New Event">New Event</option>
                <option value="Registration Closing">Registration Closing</option>
                <option value="Club Announcement">Club Announcement</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Audience</label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="All Tech Club Members">All Tech Club Members</option>
                <option value="All Registered Students">All Registered Students</option>
                <option value="Event Attendees Only">Event Attendees Only</option>
                <option value="Volunteers & Leads">Volunteers & Leads</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Message Content</label>
            <textarea
              rows={4}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write broadcast message..."
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Broadcast Now
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
