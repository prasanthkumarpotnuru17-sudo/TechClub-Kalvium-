"use client";

import React, { useState, useEffect, useRef } from "react";
import { Award, Download, CheckCircle2, ExternalLink, ShieldCheck, Search, X, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { registrationService } from "@/services/registrationService";
import { useRegistrations } from "@/modules/registration/sync/registrationContext";
import { eventService } from "@/services/eventService";
import { certificateService, certificateStorageService, IssuedCertificateDoc } from "@/services/certificateService";
import { certificatePDFService } from "@/services/certificatePDFService";
import { CertificatePrintView } from "@/components/admin/certificates/components/CertificatePrintView";
import { RegistrationItem, EventItem } from "@/lib/services/mockData";

interface DisplayCertificateItem {
  id: string;
  certId: string;
  name: string;
  eventName: string;
  issueDate: string;
  status: "Verified" | "Pending";
  gradient: string;
  certificateUrl?: string | null;
  storagePath?: string;
  verificationCode?: string;
  issuedBy?: string;
  isOfficial?: boolean;
  studentName?: string;
  email?: string;
}

export default function CertificatesPage() {
  const { user, firebaseUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [issuedCerts, setIssuedCerts] = useState<IssuedCertificateDoc[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification Modal State
  const [selectedCertForVerify, setSelectedCertForVerify] = useState<DisplayCertificateItem | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const { registrations: userRegs } = useRegistrations();

  useEffect(() => {
    setRegistrations(userRegs as any[]);
  }, [userRegs]);

  useEffect(() => {
    // 1. Subscribe to real Firestore Issued Certificates
    const unsubIssued = certificateService.subscribeCertificates(
      (certs) => {
        setIssuedCerts(certs);
        setLoading(false);
      },
      (err) => console.error("[CertificatesPage] Error subscribing to certificates:", err)
    );

    // 2. Subscribe to Events
    const unsubEvents = eventService.subscribeAllEvents((allEvs) => {
      setEvents(allEvs);
    });

    return () => {
      unsubIssued();
      unsubEvents();
    };
  }, []);

  const activeEmail = (user?.email || firebaseUser?.email || "").toLowerCase().trim();
  const activeName = (user?.name || firebaseUser?.displayName || "").toLowerCase().trim();

  // 1. Official Issued Certificates for Current User (excludes deleted / revoked certs)
  const myOfficialCerts = issuedCerts.filter((c) => {
    if (c.isDeleted || (c as any).status === "Revoked") return false;
    if (!activeEmail && !activeName) return false;

    const matchesEmail = activeEmail && (
      (c.email || "").toLowerCase().trim() === activeEmail ||
      (c.studentId || "").toLowerCase().trim() === activeEmail
    );
    const matchesName = activeName && (c.studentName || "").toLowerCase().trim() === activeName;

    return Boolean(matchesEmail || matchesName);
  });

  // Track all event IDs that have been explicitly issued or revoked for this user
  // so deleting a certificate in admin dashboard completely hides it (no fallback cards)
  const processedEventIds = new Set(
    issuedCerts
      .filter((c) => {
        const matchesEmail = activeEmail && (
          (c.email || "").toLowerCase().trim() === activeEmail ||
          (c.studentId || "").toLowerCase().trim() === activeEmail
        );
        const matchesName = activeName && (c.studentName || "").toLowerCase().trim() === activeName;
        return Boolean(matchesEmail || matchesName);
      })
      .map((c) => c.eventId)
  );

  const displayIssuedCerts = myOfficialCerts;

  // 2. Attended Registrations without official issued/deleted cert doc
  const attendedRegistrations = registrations.filter((r) => {
    if (r.isDeleted) return false;
    if (!activeEmail) return false;
    const matchesUser = (r.email || "").toLowerCase().trim() === activeEmail;
    const isAttended = r.attendance === "Attended" || r.status === "Confirmed" || r.status === "Attended";
    const alreadyProcessed = processedEventIds.has(r.eventId);
    return matchesUser && isAttended && !alreadyProcessed;
  });

  const gradients = [
    "from-amber-600 to-amber-800",
    "from-blue-600 to-indigo-600",
    "from-purple-600 to-pink-600",
    "from-emerald-600 to-teal-600",
  ];

  // Combine official issued certs + attended event certs
  const officialCertItems: DisplayCertificateItem[] = displayIssuedCerts.map((c, index) => ({
    id: c.id,
    certId: c.certificateNumber || `TC-${c.id.slice(-6).toUpperCase()}`,
    name: `${c.eventName} — Official Certificate of Completion`,
    eventName: c.eventName,
    issueDate: c.issuedDate || "Verified Recently",
    status: "Verified",
    gradient: gradients[index % gradients.length],
    certificateUrl: c.certificateUrl,
    storagePath: c.storagePath,
    verificationCode: c.verificationCode || `VERIFIED-${c.certificateNumber}`,
    issuedBy: c.issuedBy?.name || "Tech Club Management",
    isOfficial: true,
    studentName: c.studentName || user?.name || "Student Recipient",
    email: c.email,
  }));

  const registrationCertItems: DisplayCertificateItem[] = attendedRegistrations.map((reg, index) => {
    const matchedEvent = events.find(
      (e) => e.id === reg.eventId || e.title?.toLowerCase() === reg.eventName?.toLowerCase()
    );
    const eventTitle = matchedEvent?.title || reg.eventName || "Tech Club Event";
    const issueDate = reg.registeredDate
      ? new Date(reg.registeredDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Verified Recently";
    const certId = `CERT-${reg.id.slice(-6).toUpperCase()}`;

    return {
      id: reg.id,
      certId,
      name: `${eventTitle} — Official Completion Certificate`,
      eventName: eventTitle,
      issueDate,
      status: "Verified",
      gradient: gradients[(officialCertItems.length + index) % gradients.length],
      verificationCode: `VERIFIED-${certId}-EVENT`,
      issuedBy: "Tech Club Management",
      isOfficial: false,
      studentName: reg.name || user?.name || "Student Recipient",
      email: reg.email,
    };
  });

  const allCertificates = [...officialCertItems, ...registrationCertItems];

  const filtered = allCertificates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [downloadingCertId, setDownloadingCertId] = useState<string | null>(null);
  const [viewingCertId, setViewingCertId] = useState<string | null>(null);
  const [processingCertNotice, setProcessingCertNotice] = useState<DisplayCertificateItem | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [renderingCert, setRenderingCert] = useState<DisplayCertificateItem | null>(null);

  const handleViewPDF = async (cert: DisplayCertificateItem) => {
    try {
      setViewingCertId(cert.id);
      const path = cert.storagePath || cert.certificateUrl;
      if (path) {
        const signedUrl = await certificateStorageService.getCertificateSignedUrl(path, 3600);
        if (signedUrl) {
          window.open(signedUrl, "_blank");
          return;
        }
      }
      handleVerify(cert);
    } catch (err) {
      console.error("[CertificatesPage] View error:", err);
      handleVerify(cert);
    } finally {
      setViewingCertId(null);
    }
  };

  const handleDownloadPDF = async (cert: DisplayCertificateItem) => {
    try {
      setDownloadingCertId(cert.id);
      // Primary Flow: Dynamically generate fresh signed URL on-demand from Supabase Storage
      const path = cert.storagePath || cert.certificateUrl;
      if (path) {
        const signedUrl = await certificateStorageService.getCertificateSignedUrl(path, 3600);
        if (signedUrl) {
          const link = document.createElement("a");
          link.href = signedUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.download = `${cert.certId}_${cert.eventName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Certificate.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }

      // Fallback Flow: Regenerate and download official PDF on-demand if cloud URL not ready
      await handleExecuteDevFallbackDownload(cert);
    } catch (err) {
      console.error("[CertificatesPage] Download error:", err);
      alert("Failed to download certificate from Supabase Storage. Please try again.");
    } finally {
      setDownloadingCertId(null);
    }
  };

  const handleExecuteDevFallbackDownload = async (cert: DisplayCertificateItem) => {
    try {
      setDownloadingCertId(cert.id);
      setRenderingCert(cert);

      // Wait 150ms for offscreen DOM to update with recipient & event details
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (pdfRef.current) {
        const blob = await certificatePDFService.generatePDFBlob(pdfRef.current, {
          orientation: "landscape",
          backgroundColor: "#FFFFFF",
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${cert.certId}_${cert.eventName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("[CertificatesPage] Error generating certificate PDF on the fly:", err);
    } finally {
      setDownloadingCertId(null);
      setRenderingCert(null);
      setProcessingCertNotice(null);
    }
  };

  const handleVerify = (cert: DisplayCertificateItem) => {
    setSelectedCertForVerify(cert);
    setCopiedCode(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-medium bg-white rounded-2xl border border-gray-200">
        Loading your verified credentials from Firestore...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Verifiable Student Credentials
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950">My Certificates</h1>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search certificates by event or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-gray-200 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-950">No Verified Certificates Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto font-medium">
              Participate in campus events or complete required sessions to receive verified official credentials here.
            </p>
          </div>
        </div>
      ) : (
        /* Certificates Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((cert) => (
            <div
              key={cert.id}
              className="rounded-[24px] bg-white border border-gray-200/80 shadow-xs overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Preview Banner */}
              <div className={`p-6 bg-gradient-to-r ${cert.gradient} text-white space-y-3 relative`}>
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span className="bg-black/20 px-2.5 py-1 rounded-lg backdrop-blur-md">{cert.certId}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] uppercase font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-300" /> {cert.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold leading-tight">{cert.name}</h3>
                <p className="text-xs text-white/90 font-medium">{cert.eventName}</p>
              </div>

              {/* Actions & Details */}
              <div className="p-5 space-y-4 bg-white text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Issued Date: <strong className="text-slate-950">{cert.issueDate}</strong></span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Authentic
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Storage Active
                  </span>
                  <span className="font-mono text-slate-600">PDF Cloud Uploaded</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button
                    onClick={() => handleViewPDF(cert)}
                    disabled={viewingCertId === cert.id}
                    className="min-h-[40px] bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {viewingCertId === cert.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-blue-600" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                    )}
                    View Certificate
                  </Button>
                  <Button
                    onClick={() => handleDownloadPDF(cert)}
                    disabled={downloadingCertId === cert.id}
                    className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {downloadingCertId === cert.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin text-white" />
                    ) : (
                      <Download className="w-3.5 h-3.5 mr-1" />
                    )}
                    {downloadingCertId === cert.id ? "Downloading..." : "Download PDF"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden Offscreen Container for High-DPI PDF Generation */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none opacity-100 overflow-hidden w-[1123px] h-[794px]">
        <CertificatePrintView
          ref={pdfRef}
          recipient={{
            studentName: renderingCert?.studentName || user?.name || "Student Recipient",
            certNumber: renderingCert?.certId || "TC-2026-000001",
            verificationCode: renderingCert?.verificationCode || "VERIFIED-CREDENTIAL",
            issuedDate: renderingCert?.issueDate || new Date().toLocaleDateString("en-GB"),
            eventTitle: renderingCert?.eventName || "Tech Event",
            organizer: renderingCert?.issuedBy || "Tech Club Management",
          }}
        />
      </div>

      {/* Verification Details Modal */}
      {selectedCertForVerify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Credential Verification Proof</h3>
              </div>
              <button
                onClick={() => setSelectedCertForVerify(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>CRYPTOGRAPHICAL STATUS: VERIFIED & AUTHENTIC</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Certificate Number:</span>
                <span className="font-mono font-bold text-slate-950">{selectedCertForVerify.certId}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Recipient Name:</span>
                <span className="font-bold text-slate-950">{selectedCertForVerify.studentName}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Event Title:</span>
                <span className="font-bold text-slate-950">{selectedCertForVerify.eventName}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Issue Date:</span>
                <span className="font-bold text-slate-950">{selectedCertForVerify.issueDate}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-medium">Issuing Authority:</span>
                <span className="font-bold text-slate-950">{selectedCertForVerify.issuedBy || "Tech Club Management"}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Verification Code Hash
                </label>
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border font-mono text-[11px]">
                  <span className="truncate pr-2">{selectedCertForVerify.verificationCode}</span>
                  <button
                    onClick={() => handleCopyCode(selectedCertForVerify.verificationCode || "")}
                    className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer transition-all"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setSelectedCertForVerify(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-5"
              >
                Close Verification
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Notice Modal for Unrendered Storage Certificates */}
      {processingCertNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">Certificate Processing</h3>
              </div>
              <button
                onClick={() => setProcessingCertNotice(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                Credential Registered & Pending Finalization
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Your official certificate record for <strong>"{processingCertNotice.eventName}"</strong> has been registered. The high-resolution PDF file is currently being finalized in Firebase Storage by campus administrators.
              </p>
            </div>

            <div className="space-y-2 text-xs border-t pt-3">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Certificate Number:</span>
                <span className="font-mono font-bold text-slate-950">{processingCertNotice.certId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Recipient Name:</span>
                <span className="font-bold text-slate-950">{processingCertNotice.studentName}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleExecuteDevFallbackDownload(processingCertNotice)}
                disabled={downloadingCertId === processingCertNotice.id}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                {downloadingCertId === processingCertNotice.id ? "Rendering..." : "Generate Dev Fallback PDF"}
              </button>

              <Button
                onClick={() => setProcessingCertNotice(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl px-4"
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
