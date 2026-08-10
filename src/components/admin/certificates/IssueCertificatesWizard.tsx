"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Layers,
  UserCheck,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Check,
  Plus,
  X,
  UserPlus,
  Sparkles
} from "lucide-react";
import {
  CertificateTemplate,
  IssuedCertificateDoc,
  certificateService,
  DEFAULT_SYSTEM_TEMPLATES
} from "@/services/certificateService";
import { CertificatePrintView } from "./components/CertificatePrintView";
import { eventService } from "@/services/eventService";
import { registrationService } from "@/services/registrationService";
import { EventItem, RegistrationItem } from "@/lib/services/mockData";
import { useAuthContext } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface IssueCertificatesWizardProps {
  publishedTemplates: CertificateTemplate[];
  onIssuanceComplete: () => void;
}

export function IssueCertificatesWizard({ publishedTemplates, onIssuanceComplete }: IssueCertificatesWizardProps) {
  const { user, firebaseUser } = useAuthContext();

  // Firestore Data State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(
    publishedTemplates.length > 0 ? publishedTemplates[0] : null
  );

  const [eligibleParticipants, setEligibleParticipants] = useState<RegistrationItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  // Manual Attendee Creation State
  const [showAddAttendeeModal, setShowAddAttendeeModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualDept, setManualDept] = useState("Computer Science & Engineering");

  // Issuance Execution State
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuingProgress, setIssuingProgress] = useState<{ current: number; total: number; studentName: string } | null>(null);
  const [issuanceSummary, setIssuanceSummary] = useState<{ generated: number; skipped: number; failed: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastSuccessMessage, setToastSuccessMessage] = useState<string | null>(null);

  // Dynamic Student Render State for High-DPI PDF Capture
  const [currentRenderingStudent, setCurrentRenderingStudent] = useState<{
    studentName: string;
    certNumber: string;
    verificationCode: string;
    issuedDate: string;
  } | null>(null);

  const pdfRenderRef = useRef<HTMLDivElement>(null);

  // Update selected template if props change
  useEffect(() => {
    if (publishedTemplates.length > 0) {
      if (!selectedTemplate || !publishedTemplates.some((t) => t.id === selectedTemplate.id)) {
        const defaultTpl = publishedTemplates.find((t) => t.isDefault) || publishedTemplates[0];
        setSelectedTemplate(defaultTpl);
      }
    }
  }, [publishedTemplates]);

  // Load events from Firestore
  useEffect(() => {
    const unsub = eventService.subscribeAllEvents((allEvts) => {
      setEvents(allEvts);
      setLoadingEvents(false);
      if (allEvts.length > 0 && !selectedEvent) {
        setSelectedEvent(allEvts[0]);
      }
    });
    return () => unsub();
  }, []);

  // Load participants whenever selectedEvent changes
  useEffect(() => {
    if (!selectedEvent) {
      setEligibleParticipants([]);
      setSelectedParticipantIds([]);
      return;
    }

    const loadParticipants = async () => {
      try {
        setLoadingParticipants(true);
        const regs = await registrationService.getRegistrationsByEventId(selectedEvent.id);
        const eligible = regs.filter(
          (r) => r.attendance === "Attended" || r.attendance === "Checked In" || r.status === "Confirmed" || r.status === "Attended"
        );
        const targetList = eligible.length > 0 ? eligible : regs;
        setEligibleParticipants(targetList);
        setSelectedParticipantIds(targetList.map((p) => p.id));
      } catch (err) {
        console.error("[IssueCertificatesWizard] Error loading participants:", err);
      } finally {
        setLoadingParticipants(false);
      }
    };

    loadParticipants();
  }, [selectedEvent]);

  // Add Manual Attendee Handler
  const handleAddManualAttendee = () => {
    if (!manualName.trim() || !manualEmail.trim()) return;
    const newAttendee: RegistrationItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      eventId: selectedEvent?.id || "general",
      eventName: selectedEvent?.title || "General Event",
      name: manualName.trim(),
      email: manualEmail.trim().toLowerCase(),
      department: manualDept || "General",
      year: "2026",
      status: "Confirmed",
      attendance: "Attended",
      registeredDate: new Date().toISOString(),
    };

    setEligibleParticipants((prev) => [newAttendee, ...prev]);
    setSelectedParticipantIds((prev) => [...prev, newAttendee.id]);
    setManualName("");
    setManualEmail("");
    setShowAddAttendeeModal(false);
  };

  // Main Execute Issuance Action
  const handleExecuteIssuance = async () => {
    if (!selectedEvent || !selectedTemplate || selectedParticipantIds.length === 0 || isIssuing) return;

    try {
      setIsIssuing(true);
      setErrorMessage(null);

      // Auto-publish draft template if user selected a draft template for issuance
      if (selectedTemplate.status !== "Published" && selectedTemplate.id && !selectedTemplate.id.startsWith("tpl-default")) {
        try {
          await certificateService.publishTemplate(selectedTemplate.id);
          selectedTemplate.status = "Published";
        } catch (pubErr) {
          console.warn("[IssueCertificatesWizard] Notice auto-publishing draft template:", pubErr);
        }
      }

      const selectedStudents = eligibleParticipants.filter((p) => selectedParticipantIds.includes(p.id));
      let generatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;

      const issuerInfo = {
        uid: user?.email || firebaseUser?.uid || "admin",
        name: user?.name || firebaseUser?.displayName || user?.email || "Admin Coordinator",
      };

      const eventInfo = {
        id: selectedEvent.id,
        title: selectedEvent.title,
        date: selectedEvent.date,
      };

      console.log(`[1] Template Loaded: "${selectedTemplate.name}" (v${selectedTemplate.version || 1}) - Status: ${selectedTemplate.status}`);

      for (let i = 0; i < selectedStudents.length; i++) {
        const student = selectedStudents[i];
        const certNumber = await certificateService.generateNextCertificateNumber();
        const verificationCode = `VERIFIED-${certNumber}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        const issuedDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

        const studentPayload = {
          studentId: student.id || student.email,
          studentName: student.name || "Student",
          email: student.email,
          department: student.department || "General",
          year: student.year || "2026",
        };

        // Render recipient info dynamically onto offscreen DOM container
        setCurrentRenderingStudent({
          studentName: student.name || "Student",
          certNumber,
          verificationCode,
          issuedDate,
        });

        setIssuingProgress({
          current: i + 1,
          total: selectedStudents.length,
          studentName: student.name || student.email,
        });

        // Wait 150ms for DOM to reflect updated recipient placeholders before taking snapshot
        await new Promise((resolve) => setTimeout(resolve, 150));

        console.log(`[2] Template Rendered for Student: "${student.name || student.email}" - Ref attached: ${!!pdfRenderRef.current}`);

        const effectiveTemplate = {
          ...selectedTemplate,
          elements: (selectedTemplate.elements && selectedTemplate.elements.length > 0)
            ? selectedTemplate.elements
            : DEFAULT_SYSTEM_TEMPLATES[0].elements
        };

        const res = await certificateService.issueCertificate(
          studentPayload,
          eventInfo,
          effectiveTemplate,
          issuerInfo,
          pdfRenderRef.current
        );

        if (res.isSkipped) {
          skippedCount++;
        } else if (res.doc?.pdfStatus === "Failed") {
          failedCount++;
        } else {
          generatedCount++;
          if (res.emailDeliverySuccess) {
            setToastSuccessMessage("Certificate issued and emailed successfully.");
          } else {
            setToastSuccessMessage("Certificate downloaded successfully, but email delivery failed.");
          }
        }
      }

      setIssuanceSummary({ generated: generatedCount, skipped: skippedCount, failed: failedCount });
      onIssuanceComplete();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to issue certificates.");
    } finally {
      setIsIssuing(false);
      setIssuingProgress(null);
      setCurrentRenderingStudent(null);
    }
  };

  const filteredParticipants = eligibleParticipants.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || (p.name || "").toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Hidden Off-Screen Container for High-DPI PDF Capture */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none opacity-100 overflow-hidden w-[1123px] h-[794px]">
        <CertificatePrintView
          ref={pdfRenderRef}
          canvasSettings={selectedTemplate?.canvas}
          elements={selectedTemplate?.elements}
          backgroundImageUrl={selectedTemplate?.canvas?.backgroundImageUrl || selectedTemplate?.assets?.background?.downloadUrl || ""}
          recipient={{
            studentName: currentRenderingStudent?.studentName || "Student Name",
            certNumber: currentRenderingStudent?.certNumber || "TC-2026-000001",
            verificationCode: currentRenderingStudent?.verificationCode || "VERIFIED-000001",
            issuedDate: currentRenderingStudent?.issuedDate || new Date().toLocaleDateString("en-GB"),
            eventTitle: selectedEvent?.title || "Event Name",
            organizer: "Tech Club Management",
          }}
        />
      </div>

      {/* Toast Feedback */}
      {toastSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastSuccessMessage}</span>
          </div>
          <button onClick={() => setToastSuccessMessage(null)} className="hover:underline text-[10px]">Dismiss</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="hover:underline text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Controls Header Card: Round Dropdown Selection for Events & Templates */}
      <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Issue Official Certificates
            </h3>
            <p className="text-xs text-gray-500">
              Select an event and published template to issue credentials to registered attendees.
            </p>
          </div>

          <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-xs font-bold border border-amber-500/20">
            {publishedTemplates.length} Templates Available
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Round Dropdown for Event Selection */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Select Event (Round Dropdown)
            </label>
            {loadingEvents ? (
              <div className="px-4 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading Events...
              </div>
            ) : events.length === 0 ? (
              <div className="px-4 py-2.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-semibold">
                No Events Found in Firestore
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedEvent?.id || ""}
                  onChange={(e) => {
                    const evt = events.find((item) => item.id === e.target.value);
                    if (evt) setSelectedEvent(evt);
                  }}
                  className="w-full px-4 py-2.5 rounded-full border border-amber-500/40 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer appearance-none pr-10"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.date || "No Date"}) • {evt.category || "Event"}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500 font-bold text-xs">
                  ▼
                </div>
              </div>
            )}
          </div>

          {/* Round Dropdown for Template Selection */}
          <div className="relative">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              Select Certificate Template (Round Dropdown)
            </label>
            {publishedTemplates.length === 0 ? (
              <div className="px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 font-semibold flex items-center justify-between">
                <span>No published templates found</span>
                <span className="text-[10px] text-gray-400">Publish in Studio first</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => {
                    const tpl = publishedTemplates.find((item) => item.id === e.target.value);
                    if (tpl) setSelectedTemplate(tpl);
                  }}
                  className="w-full px-4 py-2.5 rounded-full border border-amber-500/40 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer appearance-none pr-10"
                >
                  {publishedTemplates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} (v{tpl.version}) {tpl.status !== "Published" ? `[${tpl.status}]` : ""} {tpl.isDefault ? "★ Default" : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-amber-500 font-bold text-xs">
                  ▼
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Integrated Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Attendees List */}
        <div className="lg:col-span-7 glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-amber-500" />
              Event Attendees ({eligibleParticipants.length})
            </h4>

            <div className="flex items-center gap-3 text-xs font-bold">
              <button
                onClick={() => setSelectedParticipantIds(eligibleParticipants.map((p) => p.id))}
                className="text-amber-600 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => setSelectedParticipantIds([])}
                className="text-gray-400 hover:underline cursor-pointer"
              >
                Clear
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="px-2.5 py-1 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" /> + Add Attendee
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search attendee by name or email..."
              className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {loadingParticipants ? (
            <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              Loading attendees from Firestore...
            </div>
          ) : eligibleParticipants.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl space-y-3">
              <p className="font-bold text-xs text-gray-700 dark:text-gray-300">No attendees registered for this event yet.</p>
              <p className="text-[11px] text-gray-400">Click "+ Add Attendee" above to manually add recipient names for issuance.</p>
              <button
                onClick={() => setShowAddAttendeeModal(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                + Add Attendee Manually
              </button>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {filteredParticipants.map((p) => {
                const isChecked = selectedParticipantIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (isChecked) {
                        setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== p.id));
                      } else {
                        setSelectedParticipantIds([...selectedParticipantIds, p.id]);
                      }
                    }}
                    className={cn(
                      "p-3 flex items-center justify-between text-xs cursor-pointer transition-all select-none",
                      isChecked ? "bg-amber-500/10 border-l-4 border-l-amber-500" : "hover:bg-gray-50/50 dark:hover:bg-gray-900/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{p.name || "Student"}</p>
                        <p className="text-[10px] text-gray-400">{p.email} • {p.department || "CSE"}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-500/20">
                      Eligible
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Live Preview & Action Button */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 bg-gray-950 flex flex-col items-center justify-center min-h-[320px] text-center relative overflow-hidden">
            <div className="flex items-center justify-between w-full mb-3 text-xs font-bold text-amber-500 px-1">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Certificate Preview
              </span>
              <span className="text-[10px] text-gray-400">
                {selectedTemplate?.name || "No Template Selected"}
              </span>
            </div>

            <div
              className="relative w-full aspect-[1.414/1] rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-cover bg-center p-4 select-none"
              style={{
                backgroundImage: `url(${selectedTemplate?.canvas?.backgroundImageUrl || selectedTemplate?.assets?.background?.downloadUrl || ""})`,
                backgroundColor: selectedTemplate?.canvas?.backgroundColor || "#FFFFFF",
              }}
            >
              {((selectedTemplate?.elements && selectedTemplate.elements.length > 0) ? selectedTemplate.elements : DEFAULT_SYSTEM_TEMPLATES[0].elements).map((el) => {
                let sampleVal = el.content || el.label || "";
                if (el.type === "placeholder") {
                  if (el.placeholderKey === "participant_name") {
                    const firstSelected = eligibleParticipants.find(p => selectedParticipantIds.includes(p.id));
                    sampleVal = firstSelected ? (firstSelected.name || "Student Name") : "Student Name";
                  }
                  else if (el.placeholderKey === "event_name") sampleVal = selectedEvent?.title || "Event Name";
                  else if (el.placeholderKey === "issue_date") sampleVal = new Date().toLocaleDateString("en-GB");
                  else if (el.placeholderKey === "certificate_number") sampleVal = "TC-2026-000001";
                  else sampleVal = `{{${el.placeholderKey}}}`;
                }

                return (
                  <div
                    key={el.id}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{
                      left: `${el.x}%`,
                      top: `${el.y}%`,
                      fontSize: el.styles?.fontSize ? `${Math.max(10, Math.round(el.styles.fontSize * 0.45))}px` : "12px",
                      fontFamily: el.styles?.fontFamily || "Inter",
                      fontWeight: el.styles?.fontWeight || "normal",
                      color: el.styles?.fontColor || "#1E293B",
                    }}
                  >
                    {sampleVal}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primary Action Button: ISSUE CERTIFICATE */}
          <div className="glass-card p-5 rounded-3xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Selected Recipients:</span>
              <span className="font-bold text-emerald-600 text-sm">{selectedParticipantIds.length} Attendees</span>
            </div>

            <button
              onClick={handleExecuteIssuance}
              disabled={isIssuing || selectedParticipantIds.length === 0 || !selectedEvent || !selectedTemplate}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isIssuing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span>
                {isIssuing
                  ? "Issuing Credentials..."
                  : `Issue Certificate${selectedParticipantIds.length > 1 ? "s" : ""} (${selectedParticipantIds.length})`}
              </span>
            </button>

            {(!selectedEvent || !selectedTemplate) && (
              <p className="text-[10px] text-amber-600 text-center font-semibold">
                Please select both an Event and a Published Template to issue certificates.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Manual Attendee Modal */}
      {showAddAttendeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl space-y-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                Add Attendee Manually
              </h3>
              <button onClick={() => setShowAddAttendeeModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Student Name *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="e.g. rahul@example.com"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  value={manualDept}
                  onChange={(e) => setManualDept(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddAttendeeModal(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualAttendee}
                disabled={!manualName.trim() || !manualEmail.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Add Attendee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal during Batch Issuance */}
      {isIssuing && issuingProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl space-y-4 bg-white dark:bg-gray-950 text-center shadow-2xl">
            <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Generating Credentials & Supabase PDFs</h3>
            <p className="text-xs text-gray-500">Processing recipient: <span className="font-bold text-amber-600">{issuingProgress.studentName}</span>...</p>
            <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300"
                style={{ width: `${(issuingProgress.current / issuingProgress.total) * 100}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-amber-600">
              {issuingProgress.current} / {issuingProgress.total} Complete
            </span>
          </div>
        </div>
      )}

      {/* Issuance Summary Modal */}
      {issuanceSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl space-y-4 bg-white dark:bg-gray-950 text-center shadow-2xl relative border border-gray-100 dark:border-gray-800">
            <button
              onClick={() => {
                setIssuanceSummary(null);
                onIssuanceComplete();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-gray-900 dark:text-white">Certificates Issued & Uploaded</h3>

            <div className="space-y-2 text-xs font-semibold text-left bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>✓ {issuanceSummary.generated} Certificates Generated</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>✓ {issuanceSummary.generated} PDFs Uploaded to Supabase Storage</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-600">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>✓ {issuanceSummary.generated} Firestore Records Created</span>
              </div>
              {issuanceSummary.skipped > 0 && (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{issuanceSummary.skipped} Already Issued (Skipped)</span>
                </div>
              )}
              {issuanceSummary.failed > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <X className="w-4 h-4 flex-shrink-0" />
                  <span>{issuanceSummary.failed} Failed</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-gray-500 font-medium">
              No files were downloaded to your browser. Students can now View and Download their official certificates directly from their dashboard.
            </p>

            <button
              onClick={() => {
                setIssuanceSummary(null);
                onIssuanceComplete();
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all"
            >
              Done & Return to Ledger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
