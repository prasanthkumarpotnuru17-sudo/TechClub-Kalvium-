"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  User, 
  CheckCircle2,
  CalendarPlus,
  BadgeCheck
} from "lucide-react";
import { RegistrationItem, EventItem } from "@/lib/services/mockData";
import { getGoogleCalendarUrl } from "@/lib/calendarUtils";

interface EventPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: RegistrationItem | any;
  event?: EventItem | any;
}

export function EventPassModal({ isOpen, onClose, registration, event }: EventPassModalProps) {
  if (!registration) return null;

  const studentName = registration.studentName || registration.name || "Student Participant";
  const studentEmail = registration.email || "N/A";
  const eventTitle = registration.eventSnapshot?.title || event?.title || registration.eventName || "Tech Club Event";
  const eventDate = registration.eventSnapshot?.date || event?.date || registration.eventDate || (registration.registeredDate ? new Date(registration.registeredDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "2026-07-07");
  const eventTime = registration.eventSnapshot?.time || event?.time || registration.eventTime || "1:00 PM";
  const eventVenue = registration.eventSnapshot?.venue || event?.venue || registration.venue || "Tech Club Auditorium";
  const eventDescription = event?.description || registration.eventSnapshot?.description || "Interactive technical session with hands-on learning, mentor guidance, and networking opportunities.";
  const status = (registration.status || "CONFIRMED").toString().toUpperCase();

  const calendarEvent = {
    title: eventTitle,
    description: `${eventDescription} \n\nParticipant: ${studentName} (${studentEmail})`,
    location: eventVenue,
    date: eventDate,
    time: eventTime,
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(calendarEvent), "_blank");
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      className="max-w-2xl rounded-2xl p-4 md:p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-xl"
    >
      <div className="space-y-4 font-sans">
        
        {/* Page Title & Subtitle */}
        <div className="space-y-0.5 pr-6">
          <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Event Details &amp; Registration Overview
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Your registration and event information at a glance
          </p>
        </div>

        {/* Hero Section Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 p-4 md:p-5 text-white overflow-hidden shadow-md">
          
          {/* Subtle Abstract Circular SVG Pattern */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 800 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="700" cy="100" r="300" stroke="white" strokeWidth="2" />
              <circle cx="700" cy="100" r="200" stroke="white" strokeWidth="2" />
              <circle cx="100" cy="300" r="200" stroke="white" strokeWidth="2" />
            </svg>
          </div>

          {/* Top Row: Ticket Icon & Capsule Badges */}
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-md shrink-0">
                <Ticket className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                REGISTERED EVENT
              </span>
            </div>

            {/* Confirmation Pinned Badge (Top Right) */}
            <div className="shrink-0">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                {status}
              </span>
            </div>
          </div>

          {/* Bottom Row: Event Title & Description */}
          <div className="relative z-10 space-y-1 mt-3">
            <h3 className="text-lg md:text-xl font-bold text-white leading-snug tracking-tight">
              {eventTitle}
            </h3>
            <p className="text-xs text-white/90 leading-relaxed max-w-lg font-normal line-clamp-2">
              {eventDescription}
            </p>
          </div>

        </div>

        {/* Floating Information Card (Overlapping bottom of Hero) */}
        <div className="relative z-20 bg-white dark:bg-slate-900 rounded-xl shadow-md p-3.5 md:p-4 border border-slate-100 dark:border-slate-800 -mt-5 mx-2 md:mx-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            
            {/* Left: Date & Time */}
            <div className="flex items-center gap-3 pb-2 sm:pb-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  DATE &amp; TIME
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {eventDate}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {eventTime}
                </p>
              </div>
            </div>

            {/* Right: Venue / Location */}
            <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:pl-4">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div className="space-y-0">
                <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                  VENUE / LOCATION
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[220px]">
                  {eventVenue}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Registrant Information Card */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs p-4 border border-slate-100 dark:border-slate-800 space-y-3">
          
          {/* Header Row */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <h4 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              REGISTRANT INFORMATION
            </h4>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                FULL NAME
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {studentName}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                EMAIL ADDRESS
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {studentEmail}
              </p>
            </div>
          </div>

        </div>

        {/* Confirmation Card */}
        <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl p-3.5 md:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0">
              <h5 className="text-xs md:text-sm font-bold text-emerald-950 dark:text-emerald-200 leading-snug">
                Registration Confirmed
              </h5>
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                You&apos;re all set! We&apos;re excited to see you at the event.
              </p>
            </div>
          </div>

          {/* Google Calendar / View Pass Button */}
          <div className="w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={handleGoogleCalendar}
              className="w-full sm:w-auto border border-emerald-600 dark:border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600 hover:text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:-translate-y-0.5"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Add to Calendar
            </button>
          </div>
        </div>

      </div>
    </Modal>
  );
}
