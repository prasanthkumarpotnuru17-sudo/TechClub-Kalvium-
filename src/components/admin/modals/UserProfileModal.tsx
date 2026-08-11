"use client";

import React, { useState, useEffect } from "react";
import { X, Mail, Calendar, Award, CheckCircle, ShieldCheck, User as UserIcon, Loader2, AlertCircle } from "lucide-react";
import { UserItem } from "@/lib/services/mockData";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface UserProfileModalProps {
  user: UserItem | null;
  onClose: () => void;
}

export function UserProfileModal({ user, onClose }: UserProfileModalProps) {
  const [resolvedDepartment, setResolvedDepartment] = useState<string>("");
  const [resolvedYear, setResolvedYear] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchFullProfile() {
      try {
        let dept = (user?.department || "").trim();
        let yr = (user?.year || "").trim();

        // 1. Check users/{userId} doc
        if (user?.id) {
          const userSnap = await getDoc(doc(db, "users", user.id));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (!dept) dept = (uData.department || uData.dept || uData.departmentName || "").trim();
            if (!yr) yr = (uData.academicYear || uData.year || "").trim();
          }
        }

        // 2. Check profiles/{userId} doc
        if (user?.id) {
          const profileSnap = await getDoc(doc(db, "profiles", user.id));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
            if (!dept) {
              dept = (
                pData.education?.department ||
                pData.department ||
                pData.dept ||
                pData.departmentName ||
                ""
              ).trim();
            }
            if (!yr) {
              yr = (
                pData.education?.academicYear ||
                pData.academicYear ||
                pData.year ||
                ""
              ).trim();
            }
          }
        }

        // 3. Check team_access/{email} doc if applicable
        if (!dept && user?.email) {
          const teamSnap = await getDoc(doc(db, "team_access", user.email.toLowerCase().trim()));
          if (teamSnap.exists()) {
            const tData = teamSnap.data();
            if (tData.department) dept = (tData.department || "").trim();
          }
        }

        if (isMounted) {
          setResolvedDepartment(dept || "Department not available");
          setResolvedYear(yr || "Not specified");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("[UserProfileModal] Error fetching detailed profile:", err);
        if (isMounted) {
          setError("Failed to load profile details.");
          setResolvedDepartment(user?.department ? user.department.trim() : "Department not available");
          setResolvedYear(user?.year ? user.year.trim() : "Not specified");
          setLoading(false);
        }
      }
    }

    fetchFullProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
            src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
            alt={user.name}
            className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/20 mb-3 shadow-lg"
          />
          <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white">{user.name}</h3>
          <p className="text-xs text-gray-500">{user.email}</p>

          <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 capitalize">
              {user.role}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                user.status === "Active"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}
            >
              {user.status || "Active"}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-blue-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs font-medium">Fetching profile details...</span>
          </div>
        ) : error ? (
          <div className="my-4 p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="py-4 space-y-3 text-xs md:text-sm">
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Department</span>
            <span className={`font-bold ${resolvedDepartment === "Department not available" ? "text-gray-400 italic" : "text-gray-900 dark:text-gray-100"}`}>
              {resolvedDepartment}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Academic Year</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{resolvedYear}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40">
            <span className="text-gray-500">Member Since</span>
            <span className="font-bold text-gray-900 dark:text-gray-100">{user.joinedDate}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Events Attended</span>
            <span className="font-extrabold text-blue-600 dark:text-blue-400">{user.eventsAttended || 0} Verified Events</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
