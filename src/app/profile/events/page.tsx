"use client";

import React, { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { registrationService } from "@/services/registrationService";
import { eventService } from "@/services/eventService";
import { useAuthContext } from "@/context/AuthContext";
import { useRegistrations } from "@/modules/registration/sync/registrationContext";
import { RegistrationItem, EventItem } from "@/lib/services/mockData";
import { DynamicRegistrationModal } from "@/components/events/DynamicRegistrationModal";
import { EventPassModal } from "@/components/events/EventPassModal";

interface DisplayEventPass {
  id: string;
  title: string;
  category: "Upcoming" | "Completed" | "Cancelled";
  date: string;
  time: string;
  venue: string;
  ticketId: string;
  gradient: string;
  matchedEvent?: EventItem;
  rawRegistration?: any;
}

export default function MyEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const { registrations, loading: regLoading } = useRegistrations();
  const [activeTab, setActiveTab] = useState<"Upcoming" | "Completed" | "Cancelled">("Upcoming");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [selectedPassReg, setSelectedPassReg] = useState<RegistrationItem | null>(null);

  // Real-time subscription to all events (public read)
  useEffect(() => {
    const unsubEvents = eventService.subscribeAllEvents((allEvs) => {
      setEvents(allEvs);
      setLoading(false);
    });
    return () => unsubEvents();
  }, []);

  const userRegistrations = registrations;

  useEffect(() => {
    console.log(`[Pipeline Audit] STEP 12: User Portal registrations | userId: "${user?.uid || 'N/A'}" | count: ${userRegistrations.length}`);
  }, [userRegistrations.length, user?.uid]);

  const eventPasses: DisplayEventPass[] = userRegistrations.map((reg, index) => {
    const matchedEvent = events.find(
      (e) => e.id === reg.eventId || e.title?.toLowerCase() === reg.eventName?.toLowerCase()
    );

    const eventTitle = matchedEvent?.title || reg.eventName || "Tech Club Event";
    const regDate = reg.registeredAt || (reg as any).registeredDate;
    const dateStr = matchedEvent?.date || (regDate ? new Date(regDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA");
    const timeStr = matchedEvent?.time || "Scheduled Time";
    const venueStr = matchedEvent?.venue || "Tech Club Main Auditorium";
    const ticketId = reg.registrationId || `TC-PASS-${reg.id.slice(-4).toUpperCase()}`;

    let category: "Upcoming" | "Completed" | "Cancelled" = "Upcoming";
    if (reg.status === "Cancelled" || reg.status === "CANCELLED") {
      category = "Cancelled";
    } else if ((reg as any).attendance === "Attended" || matchedEvent?.status === "Completed") {
      category = "Completed";
    }

    const gradients = [
      "from-blue-600 to-indigo-600",
      "from-purple-600 to-pink-600",
      "from-emerald-600 to-teal-600",
      "from-amber-600 to-orange-600",
    ];
    const gradient = gradients[index % gradients.length];

    return {
      id: reg.id,
      title: eventTitle,
      category,
      date: dateStr,
      time: timeStr,
      venue: venueStr,
      ticketId,
      gradient,
      matchedEvent: matchedEvent || ({ id: reg.eventId, title: eventTitle, registrationConfig: { customFields: [], isTeamEvent: false } } as any),
      rawRegistration: reg,
    };
  });

  const handleCancelRegistration = async (regId: string, title: string) => {
    if (confirm(`Are you sure you want to cancel your registration for "${title}"? This action cannot be undone.`)) {
      try {
        await registrationService.cancelRegistration(regId);
      } catch (err) {
        console.error("Error cancelling registration:", err);
        alert("Failed to cancel registration. Please try again.");
      }
    }
  };

  const filtered = eventPasses.filter((e) => e.category === activeTab);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-gray-200">
        Loading your registered events and passes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-950">My Registered Events & Passes</h1>
        <p className="text-xs text-slate-500 font-medium">
          View your event passes, entry tickets, schedule, and edit registration details.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-gray-200 max-w-md">
        <button
          onClick={() => setActiveTab("Upcoming")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "Upcoming" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Upcoming ({eventPasses.filter((e) => e.category === "Upcoming").length})
        </button>
        <button
          onClick={() => setActiveTab("Completed")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "Completed" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Completed ({eventPasses.filter((e) => e.category === "Completed").length})
        </button>
        <button
          onClick={() => setActiveTab("Cancelled")}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === "Cancelled" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          }`}
        >
          Cancelled ({eventPasses.filter((e) => e.category === "Cancelled").length})
        </button>
      </div>

      {filtered.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-950">No {activeTab} Events</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Explore the main website catalog to register for upcoming hackathons and domain bootcamps.
            </p>
          </div>
        </div>
      ) : (
        /* Events Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((ev) => (
            <div
              key={ev.id}
              className="rounded-[24px] bg-white border border-gray-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className={`p-6 bg-gradient-to-r ${ev.gradient} text-white space-y-2`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="bg-black/20 backdrop-blur-md px-2.5 py-0.5 rounded-full">{ev.ticketId}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] uppercase font-bold flex items-center gap-1">
                    {ev.category === "Upcoming" && <Clock className="w-3 h-3" />}
                    {ev.category === "Completed" && <CheckCircle2 className="w-3 h-3 text-emerald-300" />}
                    {ev.category === "Cancelled" && <XCircle className="w-3 h-3 text-rose-300" />}
                    {ev.category}
                  </span>
                </div>
                <h3 className="text-base font-bold">{ev.title}</h3>
              </div>

              <div className="p-5 space-y-3 bg-white text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{ev.date} • {ev.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{ev.venue}</span>
                </div>

                {/* Status Badges Section for Member View */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Registration Status:</span>
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        ev.rawRegistration?.status === "Confirmed" || ev.rawRegistration?.status === "CONFIRMED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ev.rawRegistration?.status === "Waitlist"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : ev.rawRegistration?.status === "CANCELLED" || ev.rawRegistration?.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {ev.rawRegistration?.status === "Confirmed" || ev.rawRegistration?.status === "CONFIRMED"
                        ? "✓ Confirmed"
                        : ev.rawRegistration?.status === "Waitlist"
                        ? "🕒 Waitlisted"
                        : ev.rawRegistration?.status === "CANCELLED" || ev.rawRegistration?.status === "Cancelled"
                        ? "❌ Cancelled"
                        : ev.rawRegistration?.status || "Registered"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Attendance Check-in:</span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        ev.rawRegistration?.attendance === "Attended"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : ev.rawRegistration?.attendance === "Absent"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {ev.rawRegistration?.attendance === "Attended"
                        ? "✓ Attended"
                        : ev.rawRegistration?.attendance === "Absent"
                        ? "❌ Absent"
                        : "⏳ Pending Check-in"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(ev.rawRegistration?.paymentRequired || ev.matchedEvent?.isPaid) && (
                    <div className="col-span-2 p-3 rounded-2xl border text-xs space-y-2 mb-1 bg-slate-50 dark:bg-slate-900 border-gray-200 shadow-2xs">
                      <div className="flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-500 uppercase font-bold">Payment Status:</span>
                          <span
                            className={
                              ev.rawRegistration?.paymentStatus === "Verified"
                                ? "text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-md"
                                : ev.rawRegistration?.paymentStatus === "Rejected"
                                ? "text-rose-700 font-bold bg-rose-100 px-2.5 py-0.5 rounded-md"
                                : ev.rawRegistration?.paymentStatus === "Expired"
                                ? "text-gray-700 font-bold bg-gray-200 px-2.5 py-0.5 rounded-md"
                                : "text-amber-700 font-bold bg-amber-100 px-2.5 py-0.5 rounded-md"
                            }
                          >
                            {ev.rawRegistration?.paymentStatus === "Verified"
                              ? "✓ Verified"
                              : ev.rawRegistration?.paymentStatus === "Rejected"
                              ? "❌ Payment Rejected"
                              : ev.rawRegistration?.paymentStatus === "Expired"
                              ? "⏰ Expired"
                              : "⏳ Pending Verification"}
                          </span>
                        </div>
                      </div>

                      {ev.rawRegistration?.paymentStatus === "Rejected" && (
                        <div className="pt-1.5 border-t border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 space-y-2">
                          {(ev.rawRegistration as any).remarks && (
                            <p className="text-[11px] font-medium text-rose-700 dark:text-rose-300">
                              <strong>Reason:</strong> {(ev.rawRegistration as any).remarks}
                            </p>
                          )}
                          <button
                            onClick={() => setEditingEvent(ev.matchedEvent || null)}
                            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            Re-upload Payment Proof
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(ev.rawRegistration?.paymentStatus === "Verified" || ev.rawRegistration?.status === "CONFIRMED" || ev.rawRegistration?.status === "Confirmed" || !ev.rawRegistration?.paymentRequired) && ev.category !== "Cancelled" ? (
                    <div className="col-span-2 flex gap-2">
                      <Button
                        onClick={() => setSelectedPassReg(ev.rawRegistration || null)}
                        className="flex-1 min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                      >
                        View Event Details
                      </Button>
                      <Button
                        onClick={() => setEditingEvent(ev.matchedEvent || null)}
                        className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer px-4"
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => setEditingEvent(ev.matchedEvent || null)}
                        className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                      >
                        Edit Details
                      </Button>
                      {ev.category === "Upcoming" && (
                        <Button
                          onClick={() => handleCancelRegistration(ev.id, ev.title)}
                          className="min-h-[40px] bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Cancel Registration
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingEvent && (
        <DynamicRegistrationModal
          isOpen={!!editingEvent}
          onClose={() => setEditingEvent(null)}
          event={editingEvent}
        />
      )}

      {selectedPassReg && (
        <EventPassModal
          isOpen={!!selectedPassReg}
          onClose={() => setSelectedPassReg(null)}
          registration={selectedPassReg}
          event={events.find(e => e.id === selectedPassReg.eventId)}
        />
      )}

    </div>
  );
}
