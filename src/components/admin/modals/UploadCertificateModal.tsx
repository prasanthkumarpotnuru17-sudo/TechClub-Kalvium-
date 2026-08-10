"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, Award, FileText, CheckCircle2, Sparkles, Image as ImageIcon } from "lucide-react";
import { apiService } from "@/lib/services/apiService";
import { motion } from "framer-motion";

interface UploadCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newCert: any) => void;
}

export function UploadCertificateModal({ isOpen, onClose, onUploadSuccess }: UploadCertificateModalProps) {
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [eventNames, setEventNames] = useState<string[]>([]);
  const [eventName, setEventName] = useState("");
  const [certType, setCertType] = useState<"Completion" | "Merit" | "Excellence">("Completion");
  const [credentialId, setCredentialId] = useState(
    `KAL-2026-CERT-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiService.getEvents().then((evts) => {
      const names = evts.map((e) => e.title);
      setEventNames(names);
      if (names.length > 0) setEventName(names[0]);
    }).catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setFileName(selected.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName || !studentEmail) return;

    setIsUploading(true);

    setTimeout(() => {
      const newCertificate = {
        id: `cert-${Date.now()}`,
        credentialId: credentialId || `KAL-2026-UP-${Math.floor(1000 + Math.random() * 9000)}`,
        studentName,
        email: studentEmail,
        eventName,
        issueDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        status: "Verified",
        certType,
        fileName: fileName || "Certificate_Document.pdf",
      };

      onUploadSuccess(newCertificate);
      setIsUploading(false);
      onClose();

      // Reset form
      setStudentName("");
      setStudentEmail("");
      setFile(null);
      setFileName("");
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800 my-6"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          Upload Digital Certificate
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          Upload PDF / Image certificate files to attach verifiable credential hashes for students.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          {/* File Upload Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-500/40 hover:border-amber-500 bg-amber-500/5 p-6 rounded-2xl text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
            />

            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
              {fileName ? <FileText className="w-6 h-6 text-emerald-500" /> : <Upload className="w-6 h-6" />}
            </div>

            {fileName ? (
              <div>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs truncate max-w-xs mx-auto">
                  ✓ {fileName}
                </p>
                <span className="text-[10px] text-gray-400">Click to change file</span>
              </div>
            ) : (
              <div>
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  Click or Drag & Drop Certificate File
                </p>
                <span className="text-[10px] text-gray-400">Supports PDF, PNG, JPG (Max 10MB)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Student Full Name</label>
            <input
              type="text"
              required
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="e.g. Vikramaditya Roy"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Student Email Address</label>
            <input
              type="email"
              required
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@kalvium.community"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Target Event</label>
              <select
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                {eventNames.length === 0 ? (
                  <option value="">No events available</option>
                ) : (
                  eventNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Certificate Type</label>
              <select
                value={certType}
                onChange={(e) => setCertType(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="Completion">Completion Certificate</option>
                <option value="Merit">Certificate of Merit</option>
                <option value="Excellence">Certificate of Excellence</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Verifiable Credential Hash ID</label>
            <input
              type="text"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-xs"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Uploading Certificate..." : "Upload & Issue"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
