"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { eventService } from "@/services/eventService";
import { certificateService } from "@/services/certificateService";
import { motion } from "framer-motion";

interface UploadTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newTemplate: any) => void;
}

export function UploadTemplateModal({ isOpen, onClose, onUploadSuccess }: UploadTemplateModalProps) {
  const [templateName, setTemplateName] = useState("");
  const [eventNames, setEventNames] = useState<string[]>([]);
  const [eventName, setEventName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    eventService.getEvents().then((evts) => {
      const names = evts.map((e) => e.title);
      setEventNames(names);
      if (names.length > 0) setEventName(names[0]);
    }).catch(() => {});
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setSelectedFile(selected);
      setFileName(selected.name);

      const objectUrl = URL.createObjectURL(selected);
      setThumbnailUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);

      let backgroundAsset;
      if (selectedFile) {
        const uploadRes = await certificateService.uploadTemplateAsset(selectedFile, "modal", "background");
        backgroundAsset = uploadRes;
      }

      const created = await certificateService.createTemplate({
        name: templateName,
        status: "Draft",
        category: "Completion",
        canvas: {
          paperSize: "A4",
          orientation: "landscape",
          backgroundColor: "#FFFFFF",
          backgroundImageUrl: backgroundAsset?.downloadUrl || thumbnailUrl || "",
          backgroundOpacity: 1,
          showSafeArea: true,
          showGrid: false,
          snapToGrid: true,
        },
        assets: {
          background: backgroundAsset,
        },
      });

      onUploadSuccess(created);
      setIsUploading(false);
      onClose();

      setTemplateName("");
      setSelectedFile(null);
      setFileName("");
      setThumbnailUrl("");
    } catch (err: any) {
      console.error("[UploadTemplateModal] Error:", err);
      setErrorMsg(err?.message || "Failed to upload template.");
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800 my-6 bg-white dark:bg-gray-950"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-500" />
          Upload Certificate Background Template
        </h3>
        <p className="text-xs text-gray-500 mb-6">
          Upload certificate background image file to Firebase Storage & save Firestore record.
        </p>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-amber-500/40 hover:border-amber-500 bg-amber-500/5 p-6 rounded-2xl text-center cursor-pointer transition-colors"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".png,.jpg,.jpeg,.webp"
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
                  Click or Drag & Drop Template Background Image
                </p>
                <span className="text-[10px] text-gray-400">Supports PNG, JPG, WEBP</span>
              </div>
            )}
          </div>

          {thumbnailUrl && (
            <div className="relative h-28 rounded-xl overflow-hidden border border-amber-500/30">
              <img src={thumbnailUrl} alt="Template Preview" className="w-full h-full object-cover" />
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Golden Crest Certificate of Excellence"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Associated Event</label>
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
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Uploading to Storage..." : "Upload & Save Template"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
