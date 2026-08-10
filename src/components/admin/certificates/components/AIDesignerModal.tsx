"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  Image as ImageIcon,
  Layout,
  Check
} from "lucide-react";
import { CanvasElement } from "@/services/certificateService";
import { certificateStorageService } from "@/services/certificateStorageService";

interface LayoutOption {
  name: string;
  elements: CanvasElement[];
}

interface AIDesignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAIDesign: (bgUrl: string, elements: CanvasElement[], templateName: string) => void;
}

const EXAMPLE_PROMPTS = [
  "Design a professional certificate for a Web Development Workshop. Make the participant name large and centered. Place event name below. Date at bottom-left, certificate number at bottom-right.",
  "Modern minimalist completion certificate. Clean typography, gold heading accent line, centered participant name with high contrast.",
  "Classic achievement certificate with dark slate text, Playfair Display font, and wide line spacing.",
  "Certificate of Appreciation with gold accent typography, organizer name above signature line.",
];

export function AIDesignerModal({ isOpen, onClose, onApplyAIDesign }: AIDesignerModalProps) {
  const [prompt, setPrompt] = useState(EXAMPLE_PROMPTS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string>("");
  const [uploadingBg, setUploadingBg] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Layout Variations State (3 Options: Classic, Modern, Minimal)
  const [generatedName, setGeneratedName] = useState("");
  const [layoutOptions, setLayoutOptions] = useState<LayoutOption[]>([]);
  const [selectedLayoutIndex, setSelectedLayoutIndex] = useState<number>(0);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      setErrorMessage("Please upload a valid background image in PNG, JPG, or JPEG format.");
      return;
    }

    try {
      setSelectedFile(file);
      setErrorMessage(null);

      // Immediate visual preview
      const reader = new FileReader();
      reader.onload = () => {
        setBgPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Persistent upload to storage
      setUploadingBg(true);
      const res = await certificateStorageService.uploadTemplateAsset(file, `ai-${Date.now()}`, "background");
      if (res.downloadUrl) {
        setBgPreviewUrl(res.downloadUrl);
      }
    } catch (err: any) {
      console.warn("[AIDesignerModal] Background upload notice:", err);
    } finally {
      setUploadingBg(false);
    }
  };

  const handleExecuteAIGeneration = async () => {
    if (!prompt.trim()) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setLayoutOptions([]);

      const res = await fetch("/api/ai/design-certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          backgroundImageUrl: bgPreviewUrl,
          isRefinement: false,
        }),
      });

      const data = await res.json();

      if (!data.success || !Array.isArray(data.layouts) || data.layouts.length === 0) {
        setErrorMessage("AI could not confidently design this certificate. Please adjust it manually.");
        return;
      }

      setGeneratedName(data.templateName || "AI Workshop 2026 Certificate");
      setLayoutOptions(data.layouts);
      setSelectedLayoutIndex(0);
    } catch (err: any) {
      console.error("[AIDesignerModal] Generation error:", err);
      setErrorMessage("AI could not confidently design this certificate. Please adjust it manually.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplySelectedLayout = () => {
    if (layoutOptions.length === 0) return;
    const selected = layoutOptions[selectedLayoutIndex] || layoutOptions[0];
    onApplyAIDesign(bgPreviewUrl, selected.elements, generatedName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="glass-card max-w-3xl w-full p-6 rounded-3xl bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              AI Certificate Template Designer
            </h3>
            <p className="text-xs text-gray-500">
              Upload a background image and generate 3 layout variations using natural language.
            </p>
          </div>
        </div>

        {/* Step 1: Upload Background Image */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Step 1: Certificate Background Image (PNG, JPG, JPEG)
          </label>

          <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-amber-500/50 rounded-2xl p-3 transition-all bg-gray-50/50 dark:bg-gray-900/50 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {bgPreviewUrl ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden group">
                <img
                  src={bgPreviewUrl}
                  alt="Background Preview"
                  className="w-full h-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="px-3 py-1.5 bg-white text-gray-900 text-xs font-bold rounded-lg cursor-pointer hover:bg-gray-100">
                    Change Background Image
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer py-4 px-6 flex flex-col items-center w-full">
                <Upload className="w-7 h-7 text-amber-500 mb-2" />
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {uploadingBg ? "Uploading background asset..." : "Click to upload certificate background"}
                </span>
                <span className="text-[10px] text-gray-400 mt-1">Supports PNG, JPG, JPEG</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Step 2: Describe Layout */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Step 2: Describe Desired Design & Hierarchy
          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. Design a professional certificate for a Web Development Workshop. Make participant name large and centered..."
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500/50 outline-none resize-none"
          />

          {/* Preset Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {EXAMPLE_PROMPTS.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => setPrompt(ex)}
                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-lg text-[10px] font-medium text-left transition-all border border-amber-500/20 cursor-pointer"
              >
                Sample Prompt {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        {layoutOptions.length === 0 && (
          <div className="pt-2">
            <button
              onClick={handleExecuteAIGeneration}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Analyzing Layout & Generating 3 Alternatives...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate 3 AI Layout Variations</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step 3: Layout Variation Selection (Classic, Modern, Minimal) */}
        {layoutOptions.length > 0 && (
          <div className="space-y-4 pt-2 border-t dark:border-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                  Step 3: Select AI Layout Variation
                </label>
                <p className="text-[11px] text-gray-500">
                  AI generated 3 layout options. Click an option to preview and apply.
                </p>
              </div>
              <button
                onClick={handleExecuteAIGeneration}
                disabled={isGenerating}
                className="text-[11px] font-bold text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" /> Re-generate
              </button>
            </div>

            {/* Auto-Generated Template Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Auto-Generated Template Name:
              </label>
              <input
                type="text"
                value={generatedName}
                onChange={(e) => setGeneratedName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-900 dark:text-white"
              />
            </div>

            {/* 3 Layout Variation Cards */}
            <div className="grid grid-cols-3 gap-3">
              {layoutOptions.map((layout, idx) => {
                const isSelected = selectedLayoutIndex === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedLayoutIndex(idx)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? "border-amber-500 bg-amber-500/10 shadow-md ring-2 ring-amber-500/50"
                        : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Layout className="w-3.5 h-3.5 text-amber-500" />
                        {layout.name} Option
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <p className="text-[10px] text-gray-500">
                      {idx === 0
                        ? "Classic serif typography with elegant gold divider accent."
                        : idx === 1
                        ? "Modern sans-serif typography with high contrast hierarchy."
                        : "Minimalist layout with generous letter-spacing & refined balance."}
                    </p>

                    <div className="text-[10px] font-mono text-emerald-600 font-bold">
                      ✓ {layout.elements.length} Elements Mapped
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Apply Selected Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleApplySelectedLayout}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Apply {layoutOptions[selectedLayoutIndex]?.name || "Selected"} Layout to Studio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
