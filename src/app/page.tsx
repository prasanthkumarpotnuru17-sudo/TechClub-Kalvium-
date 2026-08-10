"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/sections/navbar";
import { Hero } from "@/components/sections/hero";
import { Events } from "@/components/sections/events";
import { AnnouncementsSection } from "@/components/sections/announcements";
import { Team } from "@/components/sections/team";
import { WhatsAppCTA } from "@/components/sections/whatsapp-cta";
import { Testimonials } from "@/components/sections/testimonials";
import { FAQ } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";
import { Footer } from "@/components/sections/footer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StickyMobileCTA } from "@/components/ui/sticky-mobile-cta";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle2, UserCheck, ShieldCheck, User as UserIcon } from "lucide-react";
import { AuthProvider, useAuthContext } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { QuickAuthModal } from "@/components/auth/QuickAuthModal";
import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { EventFieldCheckModal } from "@/components/events/EventFieldCheckModal";
import { statsService } from "@/services/statsService";
import { DynamicRegistrationModal } from "@/components/events/DynamicRegistrationModal";

function MainPageContent() {
  const {
    user,
    isAuthenticated,
    isQuickAuthOpen,
    setIsQuickAuthOpen,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isProfileViewOpen,
    setIsProfileViewOpen,
    pendingEventCheck,
    setPendingEventCheck,
    checkEventRegistrationFields,
  } = useAuthContext();

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");
  const [selectedEventObj, setSelectedEventObj] = useState<any>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [heroStats, setHeroStats] = useState<any[]>([]);

  useEffect(() => {
    statsService.getHeroStats().then((stats) => {
      setHeroStats({
        projectsCompleted: stats.projectsCompleted || 25,
        members: stats.members || 150,
        workshops: stats.workshops || 20,
        hackathonsWon: stats.hackathonsWon || 8
      } as any);
    });
  }, []);

  const [registerForm, setRegisterForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    dept: "AI & Machine Learning (AI & ML)",
    year: "1st Year",
    github: "",
  });

  const handleRegisterTrigger = (eventPayload: any, requiredFields?: string[]) => {
    if (typeof eventPayload === 'string') {
      setSelectedEventTitle(eventPayload);
      setSelectedEventObj(null);
    } else {
      setSelectedEventTitle(eventPayload.title);
      setSelectedEventObj(eventPayload);
    }
    const title = typeof eventPayload === 'string' ? eventPayload : eventPayload.title;
    const reqs = requiredFields || ["college", "academicYear"];
    checkEventRegistrationFields(title, reqs, () => {
      setIsRegisterOpen(true);
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setTimeout(() => {
      setRegisterLoading(false);
      setRegisterSuccess(true);
      setTimeout(() => {
        setRegisterSuccess(false);
        setIsRegisterOpen(false);
      }, 1800);
    }, 1200);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Top Scroll Progress Indicator */}
      <ProgressBar />

      {/* Dynamic Grid Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.02] grid-pattern" />

      {/* Floating Navigation Bar */}
      <Navbar 
        onLoginClick={() => setIsQuickAuthOpen(true)} 
        onJoinClick={() => window.open("https://chat.whatsapp.com/techclubkalvium", "_blank")} 
      />

      {/* Main Content Sections */}
      <main className="flex-grow z-10">
        <Hero 
          onJoinClick={() => window.open("https://chat.whatsapp.com/techclubkalvium", "_blank")} 
          onRegisterClick={(title) => handleRegisterTrigger(title, ["college", "academicYear"])}
          statistics={heroStats}
        />
        <Events 
          limit={3} 
          showViewAllButton={true} 
          onRegisterClick={(title) => handleRegisterTrigger(title, ["college", "academicYear", "github"])} 
        />
        <AnnouncementsSection limit={4} showViewAllButton={true} />
        <Team />
        <WhatsAppCTA />
        <Testimonials />
        <FAQ />
        <Contact />
        <StickyMobileCTA 
          onJoinClick={() => window.open("https://chat.whatsapp.com/techclubkalvium", "_blank")} 
        />
      </main>

      {/* Multi-column Footer */}
      <Footer />

      {/* 1. Quick Auth Modal (< 30 Seconds) */}
      <QuickAuthModal
        isOpen={isQuickAuthOpen}
        onClose={() => setIsQuickAuthOpen(false)}
      />

      {/* 2. Fast 3-Step Profile Onboarding Wizard */}
      <OnboardingWizard
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />



      {/* 4. Event Required Fields Check Modal */}
      {pendingEventCheck && (
        <EventFieldCheckModal
          isOpen={!!pendingEventCheck}
          onClose={() => setPendingEventCheck(null)}
          eventTitle={pendingEventCheck.eventTitle}
          missingFields={pendingEventCheck.missingFields}
          onComplete={pendingEventCheck.onComplete}
        />
      )}

      {/* 5. Event Registration Confirmation Modal */}
      {selectedEventObj ? (
        <DynamicRegistrationModal
          isOpen={isRegisterOpen}
          onClose={() => {
            setIsRegisterOpen(false);
            setSelectedEventObj(null);
          }}
          event={selectedEventObj}
        />
      ) : (
        <Modal 
          isOpen={isRegisterOpen} 
          onClose={() => setIsRegisterOpen(false)} 
          title={`Register for ${selectedEventTitle || "Event Pass"}`}
        >
          {registerSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="h-14 w-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-gray-900">Event Ticket Verified & Issued!</h4>
                <p className="text-xs text-gray-500 font-medium">
                  QR Ticket sent to {registerForm.email}. Check your student dashboard.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 pt-1">
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">Event Ticket Pass</span>
                <span className="font-semibold text-blue-600">Free Student Entry</span>
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-name" className="text-xs font-bold text-gray-700">Full Name</label>
                <input
                  type="text"
                  id="reg-name"
                  required
                  value={registerForm.name || user?.name || ""}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="reg-email" className="text-xs font-bold text-gray-700">Email Address</label>
                <input
                  type="email"
                  id="reg-email"
                  required
                  value={registerForm.email || user?.email || ""}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={registerLoading}
                className="w-full py-3.5 rounded-xl font-bold mt-2 cursor-pointer shadow-md"
              >
                Confirm Registration Ticket
              </Button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <MainPageContent />
    </AuthProvider>
  );
}
