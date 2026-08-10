"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Share2,
  Mail,
  Shield,
  Zap,
  FileSpreadsheet,
  Palette,
  Save,
  CheckCircle,
  ExternalLink,
  Lock,
  Search,
  UserCheck,
  AlertTriangle,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seedService } from "@/services/seedService";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/userService";
import { logRoleChange } from "@/services/activityLogService";
import { UserItem } from "@/lib/services/mockData";

interface SettingsViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

export function SettingsView({ darkMode, setDarkMode }: SettingsViewProps) {
  const { user: currentUser, role } = useAuth();
  const isSuperAdmin = role?.toLowerCase() === "super_admin";

  const [activeTab, setActiveTab] = useState<
    "club" | "socials" | "templates" | "firebase" | "n8n" | "sheets" | "theme" | "access"
  >("club");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [seedingStatus, setSeedingStatus] = useState<"idle" | "loading" | "success">("idle");
  const [seedingMessage, setSeedingMessage] = useState("");

  // Form states
  const [clubInfo, setClubInfo] = useState({
    clubName: "Tech Club @ Kalvium",
    tagline: "Building the Next Generation of AI & Full-Stack Engineers",
    description: "The official technology & innovation club powering hackathons, workshops, and open source projects.",
    academicYear: "2025 - 2026",
    contactEmail: "techclub@kalvium.community",
    contactPhone: "+91 98765 43210",
  });

  const [socials, setSocials] = useState({
    github: "https://github.com/kalvium-tech-club",
    linkedin: "https://linkedin.com/company/kalvium-tech-club",
    instagram: "https://instagram.com/kalvium_tech_club",
    discord: "https://discord.gg/kalviumtech",
    whatsapp: "https://chat.whatsapp.com/techclubkalvium",
  });

  const [integrationConfig, setIntegrationConfig] = useState({
    firebaseApiKey: "AIzaSyD-MOCK_KEY_849204918204",
    firebaseAuthDomain: "kalvium-tech-club.firebaseapp.com",
    firebaseProjectId: "kalvium-tech-club",
    firebaseStorageBucket: "kalvium-tech-club.appspot.com",
    n8nRegistrationWebhook: "https://n8n.kalvium.org/webhook/reg-event-trigger",
    n8nNotificationWebhook: "https://n8n.kalvium.org/webhook/send-broadcast-alert",
    googleSpreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
    autoSyncSheets: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const tabs = [
    { id: "club", label: "Club Info", icon: Building2 },
    { id: "socials", label: "Social Links", icon: Share2 },
    { id: "templates", label: "Email Templates", icon: Mail },
    { id: "firebase", label: "Firebase Config", icon: Shield },
    { id: "n8n", label: "n8n Webhooks", icon: Zap },
    { id: "sheets", label: "Google Sheets", icon: FileSpreadsheet },
    { id: "theme", label: "Theme & Aesthetics", icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Platform & Integration Settings
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Configure club details, email templates, and Firebase / n8n / Google Sheets placeholders.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold animate-pulse">
            <CheckCircle className="w-4 h-4" />
            Settings Saved Successfully!
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200/60 dark:border-gray-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Forms */}
      <div className="glass-card p-6 md:p-8 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 max-w-5xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Club Information */}
          {activeTab === "club" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Club Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Club Name</label>
                  <input
                    type="text"
                    value={clubInfo.clubName}
                    onChange={(e) => setClubInfo({ ...clubInfo, clubName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={clubInfo.academicYear}
                    onChange={(e) => setClubInfo({ ...clubInfo, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
                <input
                  type="text"
                  value={clubInfo.tagline}
                  onChange={(e) => setClubInfo({ ...clubInfo, tagline: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={clubInfo.description}
                  onChange={(e) => setClubInfo({ ...clubInfo, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* 2. Social Links */}
          {activeTab === "socials" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Social & Community Handles</h3>
              {Object.keys(socials).map((key) => (
                <div key={key}>
                  <label className="block text-xs font-semibold capitalize text-gray-700 dark:text-gray-300 mb-1">{key} URL</label>
                  <input
                    type="text"
                    value={(socials as any)[key]}
                    onChange={(e) => setSocials({ ...socials, [key]: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 3. Firebase Configuration Placeholder */}
          {activeTab === "firebase" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <strong className="block mb-0.5">Firebase Auth & Firestore Integration Placeholder</strong>
                Enter your Firebase web app config parameters below. The frontend architecture is pre-configured to consume these keys when authenticating admins and reading live Firestore documents.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                <input
                  type="text"
                  value={integrationConfig.firebaseApiKey}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, firebaseApiKey: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Auth Domain</label>
                <input
                  type="text"
                  value={integrationConfig.firebaseAuthDomain}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, firebaseAuthDomain: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Project ID</label>
                <input
                  type="text"
                  value={integrationConfig.firebaseProjectId}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, firebaseProjectId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Storage Bucket</label>
                <input
                  type="text"
                  value={integrationConfig.firebaseStorageBucket}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, firebaseStorageBucket: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* 4. n8n Webhooks Placeholder */}
          {activeTab === "n8n" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300">
                <strong className="block mb-0.5">n8n Workflow Webhooks</strong>
                Configure external triggers for automated event registrations and mass broadcasts.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Registration Sync Webhook</label>
                <input
                  type="text"
                  value={integrationConfig.n8nRegistrationWebhook}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, n8nRegistrationWebhook: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Notification Sync Webhook</label>
                <input
                  type="text"
                  value={integrationConfig.n8nNotificationWebhook}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, n8nNotificationWebhook: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* 5. Google Sheets Placeholder */}
          {activeTab === "sheets" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
                <strong className="block mb-0.5">Google Sheets API Auto Sync</strong>
                Connect your Google Sheets spreadsheet ID to automatically dump event registrations into live columns.
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Spreadsheet ID</label>
                <input
                  type="text"
                  value={integrationConfig.googleSpreadsheetId}
                  onChange={(e) => setIntegrationConfig({ ...integrationConfig, googleSpreadsheetId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs font-mono bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}

          {/* 6. Theme & Aesthetics */}
          {activeTab === "theme" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Appearance & Glassmorphism</h3>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Dark Mode Theme</p>
                  <p className="text-xs text-gray-500">Toggle dark vs light SaaS theme interface</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors p-1 flex items-center cursor-pointer",
                    darkMode ? "bg-blue-600 justify-end" : "bg-gray-300 justify-start"
                  )}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
