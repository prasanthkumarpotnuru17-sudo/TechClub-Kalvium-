"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Calendar, 
  Users, 
  Trophy, 
  LayoutGrid, 
  Sparkles,
  QrCode,
  CreditCard
} from "lucide-react";
import { Navbar } from "@/components/sections/navbar";
import { Events } from "@/components/sections/events";
import { Footer } from "@/components/sections/footer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { QuickAuthModal } from "@/components/auth/QuickAuthModal";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { DynamicRegistrationModal } from "@/components/events/DynamicRegistrationModal";
import { EventFieldCheckModal } from "@/components/events/EventFieldCheckModal";
import { useAuthContext } from "@/context/AuthContext";

export default function AllEventsPage() {
  const {
    isQuickAuthOpen,
    setIsQuickAuthOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
    pendingEventCheck,
    setPendingEventCheck,
    checkEventRegistrationFields,
  } = useAuthContext();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [selectedEventObj, setSelectedEventObj] = useState<any>(null);

  const handleRegisterTrigger = (eventPayload: any, requiredFields?: string[]) => {
    if (typeof eventPayload === "string") {
      setSelectedEventTitle(eventPayload);
      setSelectedEventObj(null);
    } else {
      setSelectedEventTitle(eventPayload.title);
      setSelectedEventObj(eventPayload);
    }
    const title = typeof eventPayload === "string" ? eventPayload : eventPayload.title;
    const reqs = requiredFields || ["college", "academicYear"];
    checkEventRegistrationFields(title, reqs, () => {
      setIsRegisterOpen(true);
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F7FC]">
      <ProgressBar />

      {/* Grid Pattern Background */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03] grid-pattern" />

      {/* Navbar */}
      <Navbar
        onLoginClick={() => setIsQuickAuthOpen(true)}
        onJoinClick={() => setIsQuickAuthOpen(true)}
      />

      <main className="flex-grow z-10 pt-24 bg-[#F4F7FC]">
        {/* Main Content Body */}
        <div className="bg-[#F4F7FC]">
          <Events
            onRegisterClick={(title) => handleRegisterTrigger(title, ["college", "academicYear", "github"])}
            showViewAllButton={false}
          />
        </div>
      </main>

      <Footer />

      {/* Auth & Registration Modals */}
      <QuickAuthModal
        isOpen={isQuickAuthOpen}
        onClose={() => setIsQuickAuthOpen(false)}
      />

      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      {pendingEventCheck && (
        <EventFieldCheckModal
          isOpen={!!pendingEventCheck}
          onClose={() => setPendingEventCheck(null)}
          eventTitle={pendingEventCheck.eventTitle}
          missingFields={pendingEventCheck.missingFields}
          onComplete={pendingEventCheck.onComplete}
        />
      )}

      {selectedEventObj && (
        <DynamicRegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => {
            setIsRegisterOpen(false);
            setSelectedEventObj(null);
          }}
          event={selectedEventObj}
        />
      )}
    </div>
  );
}
