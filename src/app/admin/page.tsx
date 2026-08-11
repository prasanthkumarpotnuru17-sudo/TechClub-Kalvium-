"use client";

import React, { useState, useEffect } from "react";
import { Sidebar, AdminTab } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { DashboardOverview } from "@/components/admin/views/DashboardOverview";
import { EventsView } from "@/components/admin/views/EventsView";
import { RegistrationsView } from "@/components/admin/views/RegistrationsView";
import { UsersView } from "@/components/admin/views/UsersView";
import { AttendanceView } from "@/components/admin/views/AttendanceView";
import { CertificatesView } from "@/components/admin/views/CertificatesView";
import { NotificationsView } from "@/components/admin/views/NotificationsView";
import { ContactMessagesView } from "@/components/admin/views/ContactMessagesView";
import { PaymentsView } from "@/components/admin/views/PaymentsView";
import { AnalyticsView } from "@/components/admin/views/AnalyticsView";
import { ReportsView } from "@/components/admin/views/ReportsView";
import { SettingsView } from "@/components/admin/views/SettingsView";
import { TeamView } from "@/components/admin/views/TeamView";

import { CommunityChatView } from "@/components/admin/views/CommunityChatView";

// Modals
import { EventModal } from "@/components/admin/modals/EventModal";
import { NotificationModal } from "@/components/admin/modals/NotificationModal";
import { TeamMemberModal } from "@/components/admin/modals/TeamMemberModal";
import { UserProfileModal } from "@/components/admin/modals/UserProfileModal";
import { GalleryUploadModal } from "@/components/admin/modals/GalleryUploadModal";

import { eventService } from "@/services/eventService";
import { announcementService } from "@/services/announcementService";
import { notificationService } from "@/services/notificationService";
import { galleryService } from "@/services/galleryService";
import { teamService } from "@/services/teamService";
import { EventItem, UserItem, TeamMemberItem } from "@/lib/services/mockData";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Modal triggers
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventItem | null>(null);

  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState<TeamMemberItem | null>(null);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState<UserItem | null>(null);

  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "coordinator"].includes(normalizedRole);

  // Sync dark mode class on <html> document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Access Denied state for non-admin users (handled primarily by layout.tsx)
  if (!user || !isAdmin) {
    return null;
  }

  const handleQuickAction = (
    action: "create-event" | "add-opportunity" | "send-notification" | "add-team" | "export-registrations"
  ) => {
    if (action === "create-event") {
      setEventToEdit(null);
      setIsEventModalOpen(true);
    } else if (action === "send-notification") {
      setIsNotifModalOpen(true);
    } else if (action === "add-team") {
      setMemberToEdit(null);
      setIsTeamModalOpen(true);
    } else if (action === "export-registrations") {
      setActiveTab("registrations");
    }
  };

  const handleSaveEvent = async (evtData: any) => {
    if (eventToEdit) {
      await eventService.updateEvent(eventToEdit.id, evtData);
    } else {
      await eventService.createEvent(evtData);
    }
  };

  const handleSendNotification = async (notifData: any) => {
    console.log("[Step 1: Admin Dashboard] handleSendNotification called with data:", JSON.stringify(notifData));
    let category: any = "General";
    if (notifData.type === "New Event") category = "New Event";
    else if (notifData.type === "Certificates") category = "Certificates";
    else if (notifData.type === "Event Reminder") category = "Event Reminder";
    else if (notifData.type === "Registration Closing") category = "Registration Closing";
    else if (notifData.type === "Club Announcement") category = "Club Announcement";
    
    const createdAnn = await announcementService.createAnnouncement({
      title: notifData.title,
      message: notifData.message,
      targetAudience: notifData.targetAudience,
      category,
      isImportant: false
    });

    console.log("[Step 1: Admin Dashboard] Announcement created in Firestore:", JSON.stringify(createdAnn));
    console.log("[Step 1: Admin Dashboard] Executing notificationService.sendAnnouncement for ID:", createdAnn.id);

    try {
      const result = await notificationService.sendAnnouncement(createdAnn);
      console.log("[Step 1: Admin Dashboard] notificationService.sendAnnouncement result:", JSON.stringify(result));
    } catch (err) {
      console.error("[Step 1: Admin Dashboard] Error executing notificationService.sendAnnouncement:", err);
    }
  };

  const handleSaveTeamMember = async (memberData: any, id?: string) => {
    if (id) {
      await teamService.updateTeamMember(id, memberData);
    } else {
      await teamService.addTeamMember(memberData);
    }
    setMemberToEdit(null);
  };

  const handleUploadPhoto = async (photoData: any) => {
    await galleryService.addGalleryImage(photoData);
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? "dark" : ""}`}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative z-10"
            >
              <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                collapsed={false}
                setCollapsed={() => {}}
                onMobileClose={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--background)]">
        {/* Header */}
        <Header
          activeTab={activeTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onOpenQuickAction={handleQuickAction}
        />

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "dashboard" && (
                <DashboardOverview
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  onOpenQuickAction={handleQuickAction}
                />
              )}

              {activeTab === "events" && (
                <EventsView
                  onOpenCreateModal={() => {
                    setEventToEdit(null);
                    setIsEventModalOpen(true);
                  }}
                  onOpenEditModal={(evt) => {
                    setEventToEdit(evt);
                    setIsEventModalOpen(true);
                  }}
                  onViewRegistrations={() => {
                    setActiveTab("registrations");
                  }}
                />
              )}

              {activeTab === "registrations" && <RegistrationsView />}

              {activeTab === "payments" && <PaymentsView />}

              {activeTab === "members" && (
                <UsersView onOpenProfileModal={(usr) => setProfileUser(usr)} />
              )}

              {activeTab === "crew" && (
                <TeamView
                  onOpenAddModal={() => {
                    setMemberToEdit(null);
                    setIsTeamModalOpen(true);
                  }}
                  onOpenEditModal={(m) => {
                    setMemberToEdit(m);
                    setIsTeamModalOpen(true);
                  }}
                />
              )}

              {activeTab === "attendance" && <AttendanceView />}

              {activeTab === "certificates" && <CertificatesView />}

              {activeTab === "announcements" && (
                <NotificationsView onOpenCreateModal={() => setIsNotifModalOpen(true)} />
              )}

              {activeTab === "community_chat" && <CommunityChatView />}

              {activeTab === "contact_messages" && <ContactMessagesView />}

              {activeTab === "analytics" && <AnalyticsView />}

              {activeTab === "reports" && <ReportsView />}

              {activeTab === "settings" && (
                <SettingsView darkMode={darkMode} setDarkMode={setDarkMode} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Modals */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        onSave={handleSaveEvent}
      />

      <NotificationModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        onSend={handleSendNotification}
        sentByName={user?.name || user?.email?.split("@")[0] || "Admin"}
      />

      <TeamMemberModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setMemberToEdit(null);
        }}
        onSave={handleSaveTeamMember}
        onAdd={handleSaveTeamMember}
        memberToEdit={memberToEdit}
      />

      <GalleryUploadModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        onUpload={handleUploadPhoto}
      />

      <UserProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
    </div>
  );
}
