"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Phone, ExternalLink, ShieldCheck, Copy, Check, Briefcase, User, Sparkles } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export interface CrewMemberProfile {
  id: string;
  name: string;
  role: string;
  roleGroup?: string;
  category?: string;
  avatarInitials: string;
  avatarBg?: string;
  avatar?: string;
  bio: string;
  linkedin: string;
  github?: string;
  email: string;
  phone?: string;
  department?: string;
}

interface CrewProfileModalProps {
  member: CrewMemberProfile | null;
  onClose: () => void;
}

export function CrewProfileModal({ member, onClose }: CrewProfileModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!member) return null;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCategoryLabel = (cat?: string, group?: string) => {
    if (group) return group;
    if (cat === "faculty") return "Faculty Advisor";
    if (cat === "core") return "Core Board Member";
    if (cat === "lead") return "Domain Lead";
    if (cat === "volunteer") return "Tech Volunteer";
    return "Crew Member";
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 220 }}
          className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 z-10"
        >
          {/* Header Banner */}
          <div className="relative h-32 bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 flex items-start justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              {getCategoryLabel(member.category, member.roleGroup)}
            </span>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer backdrop-blur-md"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Card Body */}
          <div className="px-6 pb-8 pt-0 relative">
            {/* Avatar Profile Badge */}
            <div className="-mt-14 mb-4 flex items-end justify-between">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white dark:ring-slate-900 shadow-xl"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${
                    member.avatarBg || "from-blue-600 to-indigo-600"
                  } flex items-center justify-center text-white text-3xl font-black tracking-tight ring-4 ring-white dark:ring-slate-900 shadow-xl`}
                >
                  {member.avatarInitials || member.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex items-center gap-2 mb-1">
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                    title="LinkedIn Profile"
                  >
                    <FaLinkedin className="w-5 h-5" />
                  </a>
                )}
                {member.github && (
                  <a
                    href={member.github}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    title="GitHub Profile"
                  >
                    <FaGithub className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Member Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-black text-slate-950 dark:text-white font-display leading-tight">
                  {member.name}
                </h3>
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 mt-1">
                  {member.role}
                </p>
                {member.department && (
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {member.department}
                  </p>
                )}
              </div>

              {/* Bio Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>About Crew Member</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {member.bio || "Active Tech Club leader driving student projects and technical cohorts."}
                </p>
              </div>

              {/* Contact Information List */}
              <div className="space-y-2.5 pt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Direct Contact Information
                </div>

                {/* Email Address */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Email</div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {member.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopy(member.email, "email")}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <a
                      href={`mailto:${member.email}`}
                      className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      title="Send Mail"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Mobile / Phone Number */}
                {member.phone && (
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Mobile Number</div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {member.phone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleCopy(member.phone || "", "phone")}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                        title="Copy Phone Number"
                      >
                        {copiedField === "phone" ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <a
                        href={`tel:${member.phone}`}
                        className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                        title="Call Phone Number"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-3">
                <a
                  href={`mailto:${member.email}?subject=Inquiry%20via%20Tech%20Club`}
                  className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Direct Email Message</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
