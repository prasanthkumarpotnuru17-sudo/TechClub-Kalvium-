"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, Clock, Users, Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Bell } from "lucide-react";
import { EventItem, FormField, RegistrationConfig, EventReminderConfig, EventReminderSchedule } from "@/lib/services/mockData";
import { motion, AnimatePresence } from "framer-motion";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: EventItem | null;
  onSave: (evtData: any) => void;
}

const DEFAULT_REG_CONFIG: RegistrationConfig = {
  basicFields: {
    fullName: true,
    email: true,
    registerNumber: false,
    phoneNumber: false,
    department: false,
    year: false,
  },
  isTeamEvent: false,
  minTeamSize: 2,
  maxTeamSize: 4,
  customFields: [],
};

export function EventModal({ isOpen, onClose, eventToEdit, onSave }: EventModalProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "registration" | "payment">("basic");

  const [form, setForm] = useState({
    title: "",
    banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
    description: "",
    type: "Campus" as "Campus" | "External",
    mode: "Campus" as "Campus" | "Off-Campus" | "Online",
    venue: "",
    date: "",
    time: "",
    registrationOpenDate: "",
    registrationCloseDate: "",
    capacity: 100,
    organizer: "AI & Machine Learning Domain",
    status: "Upcoming" as EventItem["status"],
    category: "AI/ML" as any,
    registrationConfig: JSON.parse(JSON.stringify(DEFAULT_REG_CONFIG)) as RegistrationConfig,
    reminders: {
      enabled: true,
      schedules: ["2_days", "1_day", "1_hour"] as EventReminderSchedule[]
    } as EventReminderConfig,
    // Paid Event Attributes
    isPaid: false,
    registrationFee: 0,
    upiId: "",
    receiverName: "",
    paymentInstructions: "",
    paymentEnabled: true,
  });

  useEffect(() => {
    if (eventToEdit) {
      setForm({
        title: eventToEdit.title,
        banner: eventToEdit.banner,
        description: eventToEdit.description,
        type: eventToEdit.type,
        mode: eventToEdit.mode || "Campus",
        venue: eventToEdit.venue,
        date: eventToEdit.date,
        time: eventToEdit.time,
        registrationOpenDate: eventToEdit.registrationOpenDate || "",
        registrationCloseDate: eventToEdit.registrationCloseDate || "",
        capacity: eventToEdit.capacity || 100,
        organizer: eventToEdit.organizer,
        status: eventToEdit.status,
        category: eventToEdit.category,
        registrationConfig: eventToEdit.registrationConfig || JSON.parse(JSON.stringify(DEFAULT_REG_CONFIG)),
        reminders: eventToEdit.reminders || {
          enabled: true,
          schedules: ["2_days", "1_day", "1_hour"]
        },
        isPaid: Boolean(eventToEdit.isPaid),
        registrationFee: eventToEdit.registrationFee || 0,
        upiId: eventToEdit.upiId || "",
        receiverName: eventToEdit.receiverName || "",
        paymentInstructions: eventToEdit.paymentInstructions || "",
        paymentEnabled: eventToEdit.paymentEnabled ?? true,
      });
    } else {
      setForm({
        title: "",
        banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80",
        description: "",
        type: "Campus",
        mode: "Campus",
        venue: "",
        date: "",
        time: "",
        registrationOpenDate: "",
        registrationCloseDate: "",
        capacity: 100,
        organizer: "AI & Machine Learning Domain",
        status: "Upcoming",
        category: "AI/ML",
        registrationConfig: JSON.parse(JSON.stringify(DEFAULT_REG_CONFIG)),
        reminders: {
          enabled: true,
          schedules: ["2_days", "1_day", "1_hour"]
        },
        isPaid: false,
        registrationFee: 0,
        upiId: "",
        receiverName: "",
        paymentInstructions: "",
        paymentEnabled: true,
      });
    }
    setActiveTab("basic");
  }, [eventToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    onSave(form);
    onClose();
  };

  const handleCustomFieldAdd = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      label: "",
      type: "text",
      required: false,
    };
    setForm(prev => ({
      ...prev,
      registrationConfig: {
        ...prev.registrationConfig,
        customFields: [...prev.registrationConfig.customFields, newField]
      }
    }));
  };

  const handleCustomFieldUpdate = (index: number, updates: Partial<FormField>) => {
    setForm(prev => {
      const newFields = [...prev.registrationConfig.customFields];
      newFields[index] = { ...newFields[index], ...updates };
      return {
        ...prev,
        registrationConfig: { ...prev.registrationConfig, customFields: newFields }
      };
    });
  };

  const handleCustomFieldRemove = (index: number) => {
    setForm(prev => {
      const newFields = [...prev.registrationConfig.customFields];
      newFields.splice(index, 1);
      return {
        ...prev,
        registrationConfig: { ...prev.registrationConfig, customFields: newFields }
      };
    });
  };

  const handleCustomFieldMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === form.registrationConfig.customFields.length - 1) return;
    
    setForm(prev => {
      const newFields = [...prev.registrationConfig.customFields];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const temp = newFields[index];
      newFields[index] = newFields[targetIndex];
      newFields[targetIndex] = temp;
      return {
        ...prev,
        registrationConfig: { ...prev.registrationConfig, customFields: newFields }
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-3xl rounded-3xl p-0 shadow-2xl relative border border-gray-200 dark:border-gray-800 my-8 max-h-[90vh] flex flex-col bg-white dark:bg-gray-900"
      >
        <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start flex-shrink-0">
          <div>
            <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1">
              {eventToEdit ? "Edit Event Details" : "Create New Event"}
            </h3>
            <p className="text-xs text-gray-500">
              Configure event details and custom registration forms.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-800 px-6 md:px-8 flex-shrink-0">
          <button
            className={`py-3 px-4 font-semibold text-sm border-b-2 ${activeTab === 'basic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`py-3 px-4 font-semibold text-sm border-b-2 ${activeTab === 'registration' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('registration')}
          >
            Registration Fields
          </button>
          <button
            className={`py-3 px-4 font-semibold text-sm border-b-2 ${activeTab === 'payment' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('payment')}
          >
            Payment & Pricing
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-grow">
          <form id="event-form" onSubmit={handleSubmit} className="space-y-6 text-xs md:text-sm">
            
            {/* BASIC INFO TAB */}
            {activeTab === 'basic' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Next.js 15 & AI Agentic Workflows Summit"
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xs md:text-sm font-semibold"
                    >
                      <option value="Campus">Campus Event</option>
                      <option value="External">External Opportunity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Mode</label>
                    <select
                      value={form.mode}
                      onChange={(e) => {
                        const mode = e.target.value as any;
                        setForm({ 
                          ...form, 
                          mode,
                          venue: mode === "Online" ? "Online (Link provided upon registration)" : form.venue === "Online (Link provided upon registration)" ? "" : form.venue 
                        });
                      }}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xs md:text-sm font-semibold"
                    >
                      <option value="Campus">Offline (Campus)</option>
                      <option value="Off-Campus">Offline (Off Campus)</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xs md:text-sm font-semibold"
                    >
                      <option value="AI/ML">AI & Machine Learning</option>
                      <option value="Web Dev">Web Development</option>
                      <option value="Cloud">Cloud & DevOps</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Cybersecurity">Cybersecurity</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select
                      value={form.status || "Upcoming"}
                      onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xs md:text-sm font-bold text-amber-600 dark:text-amber-400"
                    >
                      <option value="Upcoming">Upcoming (Opening Soon)</option>
                      <option value="Published">Published (Open Registration)</option>
                      <option value="Draft">Draft</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {form.mode !== "Online" ? (
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Venue / Location</label>
                      <input
                        type="text"
                        required
                        value={form.venue}
                        onChange={(e) => setForm({ ...form, venue: e.target.value })}
                        placeholder="e.g. Main Auditorium & Lab 4"
                        className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Venue / Location</label>
                      <input
                        type="text"
                        disabled
                        value="Online (Link provided upon registration)"
                        className="w-full px-3.5 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 cursor-not-allowed"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Capacity (Registrations)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Date</label>
                    <input
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Time Range</label>
                    <input
                      type="text"
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      placeholder="10:00 AM - 04:00 PM"
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Registration Open Date</label>
                    <input
                      type="date"
                      value={form.registrationOpenDate}
                      onChange={(e) => setForm({ ...form, registrationOpenDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Registration Close Date</label>
                    <input
                      type="date"
                      required
                      value={form.registrationCloseDate}
                      onChange={(e) => setForm({ ...form, registrationCloseDate: e.target.value })}
                      className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    value={form.banner}
                    onChange={(e) => setForm({ ...form, banner: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Outline schedule, prerequisites, and takeaway certificates..."
                    className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                  />
                </div>

                {/* Event Reminder Settings */}
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        Event Reminder Settings
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Configure when automated reminders should be scheduled for registered participants.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.reminders.schedules.includes("2_days")}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const current = form.reminders.schedules;
                          const next = checked ? [...current, "2_days"] : current.filter(s => s !== "2_days");
                          setForm({
                            ...form,
                            reminders: {
                              enabled: next.length > 0,
                              schedules: next as any
                            }
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Send reminder 2 days before</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.reminders.schedules.includes("1_day")}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const current = form.reminders.schedules;
                          const next = checked ? [...current, "1_day"] : current.filter(s => s !== "1_day");
                          setForm({
                            ...form,
                            reminders: {
                              enabled: next.length > 0,
                              schedules: next as any
                            }
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Send reminder 1 day before</span>
                    </label>

                    <label className="flex items-center gap-2.5 p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={form.reminders.schedules.includes("1_hour")}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          const current = form.reminders.schedules;
                          const next = checked ? [...current, "1_hour"] : current.filter(s => s !== "1_hour");
                          setForm({
                            ...form,
                            reminders: {
                              enabled: next.length > 0,
                              schedules: next as any
                            }
                          });
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Send reminder 1 hour before</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* PAYMENT & PRICING TAB */}
            {activeTab === 'payment' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Event Pricing & Dynamic UPI Payments
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Choose whether this event is free or paid. For paid events, the platform automatically generates a dynamic UPI QR code with the pre-filled fee amount for Google Pay, PhonePe, Paytm, and BHIM.
                  </p>
                </div>

                {/* Free vs Paid Toggle */}
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">Event Pricing Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isPaid: false })}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        !form.isPaid
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-bold text-sm">Free Event</div>
                      <div className="text-xs text-gray-500 mt-0.5">No registration fee required. Direct instant registration.</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isPaid: true })}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        form.isPaid
                          ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20"
                          : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-bold text-sm">Paid Event</div>
                      <div className="text-xs text-gray-500 mt-0.5">Requires payment verification via dynamic UPI QR Code & UTR.</div>
                    </button>
                  </div>
                </div>

                {/* Paid Event Configuration */}
                {form.isPaid && (
                  <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Registration Fee (₹ INR) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          required={form.isPaid}
                          value={form.registrationFee || ""}
                          onChange={(e) => setForm({ ...form, registrationFee: Math.max(0, Number(e.target.value)) })}
                          placeholder="e.g. 299"
                          className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          UPI ID (Virtual Payment Address) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={form.isPaid}
                          value={form.upiId}
                          onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                          placeholder="e.g. techclub@upi or 9876543210@paytm"
                          className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Receiver Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required={form.isPaid}
                          value={form.receiverName}
                          onChange={(e) => setForm({ ...form, receiverName: e.target.value })}
                          placeholder="e.g. Tech Club Kalvium"
                          className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          Payment Instructions (Optional)
                        </label>
                        <input
                          type="text"
                          value={form.paymentInstructions}
                          onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })}
                          placeholder="e.g. Please enter your 12-digit UTR and upload screenshot."
                          className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Dynamic UPI QR Preview */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row items-center gap-6">
                      {form.upiId && form.registrationFee > 0 ? (
                        <>
                          <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-md shrink-0">
                            {/* Dynamic QR image generated from encoded upi://pay URI */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                                `upi://pay?pa=${encodeURIComponent(form.upiId.trim())}&pn=${encodeURIComponent(
                                  form.receiverName.trim() || "Tech Club"
                                )}&am=${form.registrationFee}&cu=INR&tn=${encodeURIComponent(
                                  (form.title.trim() || "Event") + " Registration"
                                )}`
                              )}`}
                              alt="Generated UPI QR Code"
                              className="w-36 h-36 object-contain"
                            />
                          </div>

                          <div className="space-y-2 text-center sm:text-left">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                              <span>✓ Dynamic UPI QR Active</span>
                            </div>
                            <h5 className="font-bold text-gray-900 dark:text-white text-base">
                              Registration Fee: ₹{form.registrationFee} INR
                            </h5>
                            <p className="text-xs text-gray-500 font-mono">
                              UPI ID: <strong>{form.upiId}</strong> ({form.receiverName || "Tech Club"})
                            </p>
                            <p className="text-[11px] text-gray-400">
                              Supported Apps: <strong>Google Pay</strong>, <strong>PhonePe</strong>, <strong>Paytm</strong>, <strong>BHIM</strong>
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center w-full py-4 text-xs text-gray-400">
                          Enter UPI ID and Registration Fee above to generate live UPI QR Code preview.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* REGISTRATION CONFIG TAB */}
            {activeTab === 'registration' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Team Config */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">Team Event Configuration</h4>
                      <p className="text-gray-500 text-xs">Allow users to register as a team.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={form.registrationConfig.isTeamEvent}
                        onChange={(e) => setForm(prev => ({
                          ...prev,
                          registrationConfig: { ...prev.registrationConfig, isTeamEvent: e.target.checked }
                        }))}
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {form.registrationConfig.isTeamEvent && (
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Min Team Size</label>
                        <input
                          type="number"
                          min="1"
                          value={form.registrationConfig.minTeamSize}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            registrationConfig: { ...prev.registrationConfig, minTeamSize: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Max Team Size</label>
                        <input
                          type="number"
                          min="1"
                          value={form.registrationConfig.maxTeamSize}
                          onChange={(e) => setForm(prev => ({
                            ...prev,
                            registrationConfig: { ...prev.registrationConfig, maxTeamSize: Number(e.target.value) }
                          }))}
                          className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Built-in Fields */}
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-2">Built-in Fields</h4>
                  <p className="text-gray-500 text-xs mb-4">Select which default fields to include in the form.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(form.registrationConfig.basicFields).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl">
                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        
                        {(key === 'fullName' || key === 'email') ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Required</span>
                        ) : (
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={value as boolean}
                              onChange={(e) => setForm(prev => ({
                                ...prev,
                                registrationConfig: {
                                  ...prev.registrationConfig,
                                  basicFields: {
                                    ...prev.registrationConfig.basicFields,
                                    [key]: e.target.checked
                                  }
                                }
                              }))}
                            />
                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900 dark:text-white">Custom Fields</h4>
                    <button
                      type="button"
                      onClick={handleCustomFieldAdd}
                      className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Field
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mb-4">Add specific questions like dietary preferences or t-shirt sizes.</p>

                  <div className="space-y-3">
                    {form.registrationConfig.customFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl flex gap-4">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-1 justify-center">
                          <button 
                            type="button" 
                            onClick={() => handleCustomFieldMove(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => handleCustomFieldMove(index, 'down')}
                            disabled={index === form.registrationConfig.customFields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-900 disabled:opacity-30"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Field Config */}
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Field Label</label>
                              <input
                                type="text"
                                required
                                value={field.label}
                                onChange={(e) => handleCustomFieldUpdate(index, { label: e.target.value })}
                                placeholder="e.g. T-Shirt Size"
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Type</label>
                              <select
                                value={field.type}
                                onChange={(e) => handleCustomFieldUpdate(index, { type: e.target.value as any })}
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              >
                                <option value="text">Short Text</option>
                                <option value="number">Number</option>
                                <option value="dropdown">Dropdown</option>
                                <option value="radio">Radio</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="date">Date</option>
                              </select>
                            </div>
                            <div className="w-20">
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Required</label>
                              <select
                                value={field.required ? "yes" : "no"}
                                onChange={(e) => handleCustomFieldUpdate(index, { required: e.target.value === "yes" })}
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              >
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            </div>
                          </div>

                          {/* Options for Dropdown/Radio */}
                          {(field.type === "dropdown" || field.type === "radio") && (
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Options (Comma separated)</label>
                              <input
                                type="text"
                                required
                                value={field.options?.join(", ") || ""}
                                onChange={(e) => handleCustomFieldUpdate(index, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                                placeholder="e.g. Small, Medium, Large"
                                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <div className="flex items-start pt-5">
                          <button
                            type="button"
                            onClick={() => handleCustomFieldRemove(index)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {form.registrationConfig.customFields.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-xs">
                        No custom fields added yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </form>
        </div>

        <div className="p-6 md:p-8 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="event-form"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20"
          >
            {eventToEdit ? "Save Changes" : "Create Event"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
