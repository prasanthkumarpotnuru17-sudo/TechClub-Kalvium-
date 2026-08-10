"use client";

import React from "react";
import { Navbar } from "@/components/sections/navbar";
import { AnnouncementsSection } from "@/components/sections/announcements";
import { Footer } from "@/components/sections/footer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QuickAuthModal } from "@/components/auth/QuickAuthModal";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { useAuthContext } from "@/context/AuthContext";
import { Megaphone, Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AllAnnouncementsPage() {
  const {
    isQuickAuthOpen,
    setIsQuickAuthOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
  } = useAuthContext();

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <ProgressBar />

      {/* Grid Background Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] grid-pattern" />

      {/* Floating Navbar */}
      <Navbar
        onLoginClick={() => setIsQuickAuthOpen(true)}
        onJoinClick={() => setIsQuickAuthOpen(true)}
      />

      <main className="flex-grow z-10 pt-24 pb-16">
        {/* All Announcements Grid (No Limit) */}
        <AnnouncementsSection />
      </main>

      <Footer />

      {/* Auth Modals */}
      <QuickAuthModal
        isOpen={isQuickAuthOpen}
        onClose={() => setIsQuickAuthOpen(false)}
      />

      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
}
