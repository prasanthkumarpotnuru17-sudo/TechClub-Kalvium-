"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Award, 
  ChevronRight, 
  School, 
  Building2, 
  Laptop, 
  ArrowLeft, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  BookOpen,
  Ticket
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventItem, RegistrationItem } from "@/lib/services/mockData";
import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { useAuthContext } from "@/context/AuthContext";
import { useRegistrations } from "@/modules/registration/sync/registrationContext";
import { EventPassModal } from "@/components/events/EventPassModal";
import { isRegistrationOpen } from "@/lib/eventUtils";

interface AgendaItem {
  time: string;
  title: string;
  description: string;
}

interface Mentor {
  name: string;
  role: string;
  avatar: string;
}

interface Event extends EventItem {
  category: any;
  seatsLeft: number;
  bannerGradient: string;
  prizePool?: string;
  longDescription?: string;
  agenda?: AgendaItem[];
  highlights?: string[];
  prerequisites?: string[];
  mentors?: Mentor[];
}

interface EventsSectionProps {
  onRegisterClick: (event: EventItem) => void;
  limit?: number;
  showViewAllButton?: boolean;
}

export function Events({ onRegisterClick, limit, showViewAllButton = false }: EventsSectionProps) {
  const { user, loading: authLoading } = useAuthContext();
  const { registeredEventsMap, registeredEventIds, getEventRegistrationState, getRegistration } = useRegistrations();
  const [activeCategory, setActiveCategory] = useState<"all" | "campus" | "off-campus" | "online">("all");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [rawEvents, setRawEvents] = useState<EventItem[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<RegistrationItem[]>([]);
  const [liveEvents, setLiveEvents] = useState<Event[]>([]);
  const [passModalReg, setPassModalReg] = useState<RegistrationItem | null>(null);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);

  // Realtime Firestore subscription — all registrations (for seat counts on event cards for admins, safe fallback for students)
  useEffect(() => {
    const unsub = registrationService.subscribeRegistrations(
      (allRegs) => {
        setAllRegistrations(allRegs);
      },
      (err) => {
        console.warn("[Events Section] Non-admin snapshot notice (falling back to doc seat counts):", err?.message || err);
      }
    );
    return () => unsub();
  }, []);

  // Realtime Firestore Subscription for Events
  useEffect(() => {
    const unsub = eventService.subscribePublishedEvents((eventsData) => {
      setRawEvents(eventsData);
    });
    return () => unsub();
  }, []);

  // Recalculate live events with accurate capacity and registered counts
  useEffect(() => {
    const mapped: Event[] = rawEvents.map((e) => {
      const modeLower = ((e as any).mode || e.category || "campus").toLowerCase();
      let cat: "campus" | "off-campus" | "online" = "campus";
      if (modeLower.includes("online")) cat = "online";
      else if (modeLower.includes("off")) cat = "off-campus";

      const capacity = Number((e as any).capacity ?? (e as any).maxSeats ?? 100);

      const activeRegsForEvent = allRegistrations.filter(
        (r) =>
          !r.isDeleted &&
          r.status !== "Cancelled" &&
          r.eventId === e.id
      ).length;

      const registeredCount = Math.max((e as any).registeredCount || 0, activeRegsForEvent);
      const seatsLeft = Math.max(0, capacity - registeredCount);
      const bannerG = (e as any).bannerColor || "from-blue-600 to-indigo-700";

      return {
        ...e,
        category: cat,
        capacity,
        registeredCount,
        seatsLeft,
        type: e.type || e.category || "Workshop",
        date: e.date || "TBD",
        venue: e.venue || "Campus Auditorium",
        bannerGradient: bannerG,
        banner: e.banner,
        description: e.description || "Interactive session with hands-on labs and mentor guidance.",
      } as unknown as Event;
    });
    setLiveEvents(mapped);
  }, [rawEvents, allRegistrations]);

  // Lock scroll when full screen event details is open
  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedEvent]);

  // Handle ESC key and hashchange to close full screen details
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedEvent) {
        setSelectedEvent(null);
      }
    };
    const handleHashChange = () => {
      if (selectedEvent) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [selectedEvent]);

  const categories = [
    { id: "all", name: "All Events", icon: Calendar },
    { id: "campus", name: "Campus Events", icon: School },
    { id: "off-campus", name: "Off Campus Events", icon: Building2 },
    { id: "online", name: "Online Events", icon: Laptop },
  ];

  // Only show live Firestore events — no mock fallback
  const filteredEvents = activeCategory === "all"
    ? liveEvents
    : liveEvents.filter(event => event.category === activeCategory);

  const displayedEvents = useMemo(() => {
    if (limit && limit > 0) {
      return filteredEvents.slice(0, limit);
    }
    return filteredEvents;
  }, [filteredEvents, limit]);

  const handleShare = (eventTitle: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <section id="events" className="relative py-12 sm:py-16 bg-transparent">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        
        {/* Section Heading matching screenshot */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>UPCOMING EVENTS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950 font-display">
              Featured Club Events & Sprints
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Click any event card to view its full details, agenda, and requirements. <strong className="text-indigo-600">Register early</strong> to reserve your seat!
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {}}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-all"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>View Past Events</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-3 mb-10 pb-2 overflow-x-auto no-scrollbar scroll-smooth snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const count = cat.id === "all"
              ? liveEvents.length
              : liveEvents.filter((e: Event) => e.category === cat.id).length;
            const isActive = activeCategory === cat.id;
            
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-200 shrink-0 snap-start select-none cursor-pointer border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900 shadow-xs"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-indigo-600"}`} />
                <span>{cat.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Events Cards Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {displayedEvents.length === 0 ? (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="col-span-3 flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {activeCategory === "all" ? "No Upcoming Events" : `No ${categories.find(c => c.id === activeCategory)?.name} Yet`}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {activeCategory === "all"
                    ? "Our team is planning the next batch of events. Check back soon!"
                    : "No events in this category are currently published. Try another category or check back soon."}
                </p>
              </motion.div>
            ) : displayedEvents.map((event) => {
              const isCriticalSeats = event.seatsLeft <= 10;
              // Event registration lookup matching by ID, title, or lowercased title
              const matchingReg =
                registeredEventsMap.get(event.id) ||
                registeredEventsMap.get(event.title?.toLowerCase().trim() || "") ||
                getRegistration(event.id) ||
                getRegistration(event.title);
              const isUserRegistered = !!matchingReg && (matchingReg.status as string) !== "CANCELLED" && (matchingReg.status as string) !== "Cancelled";

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4 }}
                  key={event.id}
                  className="group cursor-pointer"
                  onClick={() => setSelectedEvent(event)}
                >
                  <Card className="h-full rounded-[30px] border border-gray-150 overflow-hidden flex flex-col justify-between hover:shadow-2xl hover:shadow-blue-500/10 hover:border-blue-300/50 transition-all duration-300 bg-white group-hover:-translate-y-1">
                    
                    {/* CSS Gradient Banner Card Header */}
                    <div className={`relative h-44 bg-gradient-to-br ${event.bannerGradient} flex flex-col justify-between p-6 overflow-hidden group/banner`}>
                      
                      {/* Optional Image Banner */}
                      {event.banner && (
                        <div className="absolute inset-0 z-0">
                          <img src={event.banner} alt={event.title} className="w-full h-full object-cover opacity-80 group-hover/banner:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                      )}
                      
                      {/* Abstract Grid Line Background inside Banner */}
                      {!event.banner && <div className="absolute inset-0 opacity-[0.12] grid-pattern z-0" />}
                      {!event.banner && <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl z-0" />}
                      
                      {/* Category Badging & Registration Badge */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                          {event.type}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {event.status === "Cancelled" ? (
                            <span className="text-[10px] font-black text-rose-300 flex items-center gap-1 bg-rose-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-rose-500/50">
                              ❌ Cancelled
                            </span>
                          ) : event.status === "Upcoming" && !isUserRegistered ? (
                            <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 bg-amber-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-500/50">
                              <Clock className="h-3.5 w-3.5 text-amber-400" /> Upcoming
                            </span>
                          ) : isUserRegistered ? (
                            matchingReg?.status === "Waitlist" ? (
                              <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 bg-amber-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-500/50">
                                <Clock className="h-3.5 w-3.5 text-amber-400" /> Waitlisted
                              </span>
                            ) : matchingReg?.paymentStatus === "Rejected" ? (
                              <span className="text-[10px] font-black text-rose-300 flex items-center gap-1 bg-rose-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-rose-500/50">
                                ❌ Payment Rejected
                              </span>
                            ) : matchingReg?.paymentStatus === "Pending" || matchingReg?.status === "PENDING_PAYMENT" || matchingReg?.status === "Payment Pending" ? (
                              <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 bg-amber-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-500/50">
                                <Clock className="h-3.5 w-3.5 text-amber-400" /> Pending Verification
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-300 flex items-center gap-1 bg-emerald-950/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-emerald-500/40">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Registered
                              </span>
                            )
                          ) : null}
                          {event.prizePool && event.status !== "Cancelled" && (
                            <span className="text-[10px] font-black text-amber-300 flex items-center gap-1 bg-amber-950/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-amber-500/30">
                              <Award className="h-3.5 w-3.5" /> {event.prizePool}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Date Badge */}
                      <div className="relative z-10 flex items-center justify-between text-white/90">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs font-bold">{event.date}</span>
                        </div>
                        <span className="text-[11px] font-semibold underline underline-offset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 text-white">
                          View Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>

                    </div>

                    {/* Card Content body */}
                    <CardContent className="p-6 flex-grow flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-250 leading-snug">
                          {event.title}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-500 leading-relaxed line-clamp-3">
                          {event.description}
                        </p>
                      </div>

                      {/* Footing Meta Details */}
                      <div className="pt-6 mt-6 border-t border-gray-100/80 flex flex-col gap-3">
                        <div className="flex items-center justify-between text-xs font-medium text-gray-500">
                          <div className="flex items-center gap-1.5 max-w-[65%] truncate">
                            <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                            <span className="truncate">{event.venue}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Users className="h-4 w-4 text-indigo-600" />
                            <span className={isCriticalSeats ? "text-red-500 font-bold" : ""}>
                              {event.seatsLeft === 0 ? "Sold Out" : `${event.seatsLeft} ${event.seatsLeft === 1 ? "seat" : "seats"} left`}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons matching screenshot */}
                        <div className="flex gap-2.5 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                            }}
                            className="flex-1 font-bold py-2.5 text-xs text-indigo-600 hover:text-indigo-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                            <span>View Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {(() => {
                            const regOpenCheck = isRegistrationOpen(event as unknown as EventItem);
                            if (event.status === "Cancelled") {
                              return (
                                <div className="flex-1 font-bold py-2.5 px-2 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl text-center flex items-center justify-center">
                                  Cancelled
                                </div>
                              );
                            } else if (!matchingReg) {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (regOpenCheck.isOpen) {
                                      onRegisterClick(event as unknown as EventItem);
                                    }
                                  }}
                                  disabled={!regOpenCheck.isOpen}
                                  className="flex-1 font-bold py-2.5 text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 disabled:opacity-60 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
                                >
                                  <span>{regOpenCheck.isOpen ? "Register Now" : (regOpenCheck.badgeText || "Closed")}</span>
                                  {regOpenCheck.isOpen && <ChevronRight className="w-3.5 h-3.5" />}
                                </button>
                              );
                            } else {
                              return (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRegisterClick(event as unknown as EventItem);
                                  }}
                                  className="flex-1 font-bold py-2.5 text-xs text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer transition-all"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Edit Details</span>
                                </button>
                              );
                            }
                          })()}
                        </div>
                      </div>

                    </CardContent>

                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Bottom Banner Card ("Don't Miss Out!") matching screenshot */}
        {showViewAllButton && (
          <div className="mt-12 p-6 sm:p-8 rounded-[32px] bg-gradient-to-r from-indigo-50/90 via-purple-50/60 to-blue-50/80 border border-indigo-100/90 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 shrink-0">
                <Calendar className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-950 font-display">Don't Miss Out!</h4>
                <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                  Seats are limited. Register early and be a part of amazing learning experiences.
                </p>
              </div>
            </div>

            <Link
              href="/events"
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
            >
              <span>Explore All Events</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

      </div>

      {/* FULL SCREEN EVENT DETAILS MODAL VIEW */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-slate-50 overflow-y-auto text-gray-900 flex flex-col min-h-screen"
          >
            {/* Main Content Area */}
            <div className="flex-grow container mx-auto max-w-5xl px-4 md:px-6 pt-24 md:pt-28 pb-10 space-y-6">

              {/* Hero Banner Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`relative rounded-3xl bg-gradient-to-br ${selectedEvent.bannerGradient} p-6 md:p-10 overflow-hidden shadow-xl border border-white/20`}
              >
                {/* Optional Image Banner */}
                {selectedEvent.banner && (
                  <div className="absolute inset-0 pointer-events-none z-0">
                    <img src={selectedEvent.banner} alt={selectedEvent.title} className="w-full h-full object-cover opacity-60 mix-blend-overlay" />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}
                
                {/* Decorative background grid and blur */}
                {!selectedEvent.banner && <div className="absolute inset-0 opacity-15 grid-pattern pointer-events-none z-0" />}
                {!selectedEvent.banner && <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none z-0" />}

                <div className="relative z-10 space-y-6">
                  {/* Badging & Back Navigation Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-black uppercase tracking-wider text-white bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-sm">
                        {selectedEvent.type}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-100 bg-black/20 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                        {selectedEvent.category.toUpperCase()}
                      </span>
                      {selectedEvent.prizePool && (
                        <span className="text-xs font-black text-amber-300 flex items-center gap-1.5 bg-amber-950/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-amber-400/30">
                          <Award className="h-4 w-4" /> Prize Pool: {selectedEvent.prizePool}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs border border-white/20 transition-all cursor-pointer group shadow-sm active:scale-95"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-1" />
                      <span>Back to Events</span>
                    </button>
                  </div>

                  {/* Title & Short Tagline */}
                  <div className="space-y-2 max-w-3xl">
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                      {selectedEvent.title}
                    </h1>
                    <p className="text-sm md:text-lg text-white/90 leading-relaxed font-normal">
                      {selectedEvent.description}
                    </p>
                  </div>

                  {/* Quick Meta Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/20">
                    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
                      <div className="p-2.5 rounded-xl bg-white/20 text-white">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-white/80">Date & Schedule</p>
                        <p className="text-xs md:text-sm font-bold text-white">{selectedEvent.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
                      <div className="p-2.5 rounded-xl bg-white/20 text-white">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-white/80">Venue / Location</p>
                        <p className="text-xs md:text-sm font-bold text-white truncate max-w-[180px]">{selectedEvent.venue}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
                      <div className="p-2.5 rounded-xl bg-white/20 text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-white/80">Seats Remaining</p>
                        <p className={`text-xs md:text-sm font-bold ${selectedEvent.seatsLeft <= 10 ? "text-amber-300" : "text-white"}`}>
                          {selectedEvent.seatsLeft === 0 ? "Sold Out" : `${selectedEvent.seatsLeft} seats open`}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>

              {/* Grid Body Section: Detailed Overview & Registration Box */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left 2 Columns: Detailed info */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Detailed Description */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.1 }}
                    className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-4 shadow-sm"
                  >
                    <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      About This Event
                    </h3>
                    <p className="text-gray-600 text-sm md:text-base leading-relaxed">
                      {selectedEvent.longDescription || selectedEvent.description}
                    </p>
                  </motion.div>

                  {/* Highlights & Benefits */}
                  {selectedEvent.highlights && selectedEvent.highlights.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 }}
                      className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-4 shadow-sm"
                    >
                      <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        Event Perks & Key Takeaways
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedEvent.highlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-gray-150">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="text-xs md:text-sm text-gray-700 font-medium leading-normal">{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Agenda / Schedule Timeline */}
                  {selectedEvent.agenda && selectedEvent.agenda.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.2 }}
                      className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-6 shadow-sm"
                    >
                      <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-indigo-600" />
                        Event Schedule & Timeline
                      </h3>
                      <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                        {selectedEvent.agenda.map((item, idx) => (
                          <div key={idx} className="relative flex items-start gap-4 pl-8">
                            <div className="absolute left-1.5 top-1.5 h-4 w-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                            <div className="space-y-1 bg-slate-50 p-4 rounded-2xl border border-gray-200/70 flex-grow">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                                  {item.time}
                                </span>
                                <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                              </div>
                              <p className="text-xs text-gray-600 leading-relaxed pt-1">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Prerequisites & Requirements */}
                  {selectedEvent.prerequisites && selectedEvent.prerequisites.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.25 }}
                      className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200/80 space-y-4 shadow-sm"
                    >
                      <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-cyan-600" />
                        Prerequisites & Preparation
                      </h3>
                      <ul className="space-y-2.5">
                        {selectedEvent.prerequisites.map((req, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-xs md:text-sm text-gray-700 bg-slate-50 px-4 py-3 rounded-xl border border-gray-150">
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                </div>

                {/* Right Column: Sticky Sidebar Card */}
                <div className="space-y-6">
                  
                  {/* Action Registration Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.15 }}
                    className="bg-white rounded-3xl p-6 border border-gray-200 space-y-6 shadow-xl sticky top-8"
                  >
                    {(() => {
                      const regState = getEventRegistrationState(selectedEvent.id);
                      const isSelectedRegistered = !regState.canRegister;
                      return (
                        <>
                          <div className="space-y-2 text-center pb-4 border-b border-gray-150">
                            <h3 className="text-xl font-bold text-gray-900">
                              {isSelectedRegistered ? "✓ Registered" : "Register for this Event"}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {isSelectedRegistered
                                ? "You have an active registration spot reserved for this event."
                                : "Instant confirmation ticket sent to your student email."}
                            </p>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs font-semibold">
                              <span className="text-gray-500">Seat Availability</span>
                              <span className={selectedEvent.seatsLeft <= 10 ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                                {selectedEvent.seatsLeft === 0 ? "Fully Booked" : `${selectedEvent.seatsLeft} seats remaining`}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, Math.max(0, Math.round((((selectedEvent.capacity || 100) - selectedEvent.seatsLeft) / (selectedEvent.capacity || 100)) * 100)))}%`
                                }}
                              />
                            </div>
                          </div>

                          {/* Primary CTAs */}
                          <div className="space-y-3 pt-2">
                            {isSelectedRegistered ? (
                              <Button
                                onClick={() => {
                                  const evt = selectedEvent;
                                  setSelectedEvent(null);
                                  onRegisterClick(evt as unknown as EventItem);
                                }}
                                variant="primary"
                                className="w-full py-4 text-sm font-bold flex justify-center items-center gap-2 rounded-2xl cursor-pointer shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                              >
                                <CheckCircle2 className="h-4 w-4 text-white" />
                                Edit Registration
                              </Button>
                            ) : (
                              <Button
                                onClick={() => {
                                  const evt = selectedEvent;
                                  setSelectedEvent(null);
                                  onRegisterClick(evt as unknown as EventItem);
                                }}
                                disabled={selectedEvent.seatsLeft === 0}
                                variant={selectedEvent.seatsLeft === 0 ? "outline" : "primary"}
                                className="w-full py-4 text-sm font-bold flex justify-center items-center gap-2 rounded-2xl cursor-pointer shadow-lg shadow-blue-500/20"
                              >
                                {selectedEvent.seatsLeft === 0 ? "Registration Closed" : "Proceed to Register"}
                                {selectedEvent.seatsLeft > 0 && <ChevronRight className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                      {/* Back Button inside sidebar */}
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="w-full py-3 text-xs font-bold text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-2xl border border-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ArrowLeft className="h-4 w-4 text-blue-600" /> Back to All Events
                      </button>

                    {/* Hosts / Mentors */}
                    {selectedEvent.mentors && selectedEvent.mentors.length > 0 && (
                      <div className="pt-6 border-t border-gray-150 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Featured Mentors</p>
                        <div className="space-y-2">
                          {selectedEvent.mentors.map((mentor, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-gray-150">
                              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow">
                                {mentor.avatar}
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-gray-900 truncate">{mentor.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{mentor.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </motion.div>

                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event Registration Pass Modal */}
      <EventPassModal
        isOpen={isPassModalOpen}
        onClose={() => setIsPassModalOpen(false)}
        registration={passModalReg}
        event={passModalReg?.eventId ? liveEvents.find(e => e.id === passModalReg.eventId) : undefined}
      />

    </section>
  );
}

