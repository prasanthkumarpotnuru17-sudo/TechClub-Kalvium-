"use client";

import React, { useState, useRef } from "react";
import { Search, Eye, Download, RefreshCcw, ShieldCheck, CheckCircle2, AlertTriangle, X, Trash2 } from "lucide-react";
import { IssuedCertificateDoc, certificateService, certificateStorageService } from "@/services/certificateService";
import { CertificatePrintView } from "./components/CertificatePrintView";
import { cn } from "@/lib/utils";

interface IssuedCertificatesLedgerProps {
  issuedCerts: IssuedCertificateDoc[];
}

export function IssuedCertificatesLedger({ issuedCerts }: IssuedCertificatesLedgerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewedCertDoc, setViewedCertDoc] = useState<IssuedCertificateDoc | null>(null);
  const [deleteConfirmCertDoc, setDeleteConfirmCertDoc] = useState<IssuedCertificateDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRegenCert, setActiveRegenCert] = useState<IssuedCertificateDoc | null>(null);

  const pdfRenderRef = useRef<HTMLDivElement>(null);

  const filteredCerts = issuedCerts.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (c.studentName || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.certificateNumber || "").toLowerCase().includes(q) ||
      (c.eventName || "").toLowerCase().includes(q)
    );
  });

  const handleDownloadCertPDF = async (certDoc: IssuedCertificateDoc) => {
    try {
      const storagePath = certDoc.storagePath || certDoc.certificateUrl;
      if (storagePath) {
        const signedUrl = await certificateStorageService.getCertificateSignedUrl(storagePath, 3600);
        if (signedUrl) {
          const link = document.createElement("a");
          link.href = signedUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.download = `${certDoc.certificateNumber || certDoc.id}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      }
      await handleRegenerateSinglePDF(certDoc);
    } catch (err: any) {
      console.error("[IssuedCertificatesLedger] Download error:", err);
      setErrorMessage("Failed to generate signed download URL.");
    }
  };

  const handleRegenerateSinglePDF = async (certDoc: IssuedCertificateDoc) => {
    try {
      setActiveRegenCert(certDoc);
      setToastMessage(`Regenerating PDF for ${certDoc.studentName}...`);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await certificateService.regenerateCertificatePDF(certDoc, pdfRenderRef.current!);
      setToastMessage(`PDF regenerated for ${certDoc.certificateNumber}!`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to regenerate PDF.");
    } finally {
      setActiveRegenCert(null);
    }
  };

  const handleDeleteCert = async () => {
    if (!deleteConfirmCertDoc) return;
    try {
      setIsDeleting(true);
      await certificateService.deleteCertificate(
        deleteConfirmCertDoc.id,
        deleteConfirmCertDoc.storagePath || deleteConfirmCertDoc.certificateUrl || undefined
      );
      setToastMessage(`Certificate ${deleteConfirmCertDoc.certificateNumber || deleteConfirmCertDoc.id} deleted from Supabase Storage and Firestore!`);
      setDeleteConfirmCertDoc(null);
    } catch (err: any) {
      console.error("[IssuedCertificatesLedger] Delete error:", err);
      setErrorMessage(err?.message || "Failed to delete certificate.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Offscreen Container for PDF Regeneration */}
      <div className="fixed top-[-9999px] left-[-9999px] pointer-events-none opacity-100">
        <CertificatePrintView
          ref={pdfRenderRef}
          canvasSettings={activeRegenCert?.templateSnapshot?.canvas}
          elements={activeRegenCert?.templateSnapshot?.elements}
          backgroundImageUrl={activeRegenCert?.templateSnapshot?.canvas?.backgroundImageUrl || activeRegenCert?.templateSnapshot?.assets?.backgroundUrl || ""}
          recipient={{
            studentName: activeRegenCert?.studentName || "Student Name",
            certNumber: activeRegenCert?.certificateNumber || "TC-2026-000001",
            verificationCode: activeRegenCert?.verificationCode || "VERIFIED-000001",
            issuedDate: activeRegenCert?.issuedDate || new Date().toLocaleDateString("en-GB"),
            eventTitle: activeRegenCert?.eventName || "Event Name",
            organizer: activeRegenCert?.issuedBy?.name || "Tech Club Management",
          }}
        />
      </div>

      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-between">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="hover:underline text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* Control Bar */}
      <div className="glass-card p-4 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, certificate number, or event..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs"
          />
        </div>
        <span className="px-3.5 py-1.5 bg-amber-500/10 text-amber-600 font-bold text-xs rounded-xl flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          {issuedCerts.length} Issued Verifiable Credentials
        </span>
      </div>

      {/* Table Ledger */}
      {filteredCerts.length === 0 ? (
        <div className="glass-card p-10 rounded-3xl text-center space-y-3">
          <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto" />
          <h4 className="font-bold text-sm">No Issued Credentials Found</h4>
          <p className="text-xs text-gray-500">Launch the Issue Certificates wizard to issue credentials.</p>
        </div>
      ) : (
        <div className="glass-card rounded-3xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3.5">Certificate No</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Event</th>
                <th className="p-3.5">Issued Date</th>
                <th className="p-3.5">PDF Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCerts.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-all">
                  <td className="p-3.5 font-mono font-bold text-amber-600">{c.certificateNumber || c.certificateId}</td>
                  <td className="p-3.5">
                    <p className="font-semibold text-gray-900 dark:text-white">{c.studentName}</p>
                    <p className="text-[10px] text-gray-400">{c.email}</p>
                  </td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{c.eventName}</td>
                  <td className="p-3.5 text-gray-500">{c.issuedDate}</td>
                  <td className="p-3.5">
                    <span
                      className={cn(
                        "px-2.5 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 w-max",
                        c.pdfStatus === "Generated"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : c.pdfStatus === "Failed"
                          ? "bg-red-500/10 text-red-600"
                          : "bg-amber-500/10 text-amber-600"
                      )}
                    >
                      {c.pdfStatus === "Generated"
                        ? (c.storagePath || c.certificateUrl ? "🟢 Generated (Supabase Storage)" : "🟢 Generated")
                        : c.pdfStatus === "Failed"
                        ? "🔴 Failed"
                        : "🟡 Pending"}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewedCertDoc(c)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg cursor-pointer"
                        title="View Certificate Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadCertPDF(c)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                        title="Download PDF File"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRegenerateSinglePDF(c)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg cursor-pointer"
                        title="Regenerate PDF"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmCertDoc(c)}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg cursor-pointer"
                        title="Delete Certificate Record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Certificate Modal */}
      {viewedCertDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl space-y-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl relative">
            <button
              onClick={() => setViewedCertDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" />
              Verifiable Credential Ledger Record
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Certificate Number</span>
                <span className="font-mono font-bold text-amber-500">{viewedCertDoc.certificateNumber || viewedCertDoc.certificateId}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Student Name</span>
                <span className="font-bold text-gray-900 dark:text-white">{viewedCertDoc.studentName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Email</span>
                <span className="text-gray-600 dark:text-gray-300">{viewedCertDoc.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Event</span>
                <span className="font-medium text-gray-900 dark:text-white">{viewedCertDoc.eventName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Issued Date</span>
                <span className="text-gray-600 dark:text-gray-300">{viewedCertDoc.issuedDate}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Issued By</span>
                <span className="text-gray-600 dark:text-gray-300">{viewedCertDoc.issuedBy?.name || "Admin"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-gray-400">Verification Hash</span>
                <span className="font-mono text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{viewedCertDoc.verificationCode}</span>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                onClick={() => handleDownloadCertPDF(viewedCertDoc)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download PDF File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Certificate Confirmation Modal */}
      {deleteConfirmCertDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-950 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between border-b dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Delete Certificate Record</h3>
              </div>
              <button
                onClick={() => setDeleteConfirmCertDoc(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-900 dark:text-red-300 text-xs space-y-1">
              <p className="font-bold">Are you sure you want to delete this credential?</p>
              <p className="text-[11px] text-red-800 dark:text-red-400 leading-relaxed font-medium">
                This will permanently delete certificate <strong>"{deleteConfirmCertDoc.certificateNumber || deleteConfirmCertDoc.id}"</strong> issued to <strong>"{deleteConfirmCertDoc.studentName}"</strong> for event <strong>"{deleteConfirmCertDoc.eventName}"</strong> from Firestore.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmCertDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCert}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Certificate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
