"use client";

import React, { useRef, useState } from "react";
import { Upload, Image as ImageIcon, CheckCircle2, Loader2, FileCheck, X } from "lucide-react";
import { certificateService, TemplateAssetMetadata } from "@/services/certificateService";

interface AssetUploaderProps {
  label: string;
  assetType: "background" | "logo" | "signature" | "seal";
  templateId?: string;
  currentAsset?: TemplateAssetMetadata;
  onAssetChange: (asset: TemplateAssetMetadata) => void;
  onClearAsset?: () => void;
  disabled?: boolean;
}

export function AssetUploader({
  label,
  assetType,
  templateId = "draft",
  currentAsset,
  onAssetChange,
  onClearAsset,
  disabled = false,
}: AssetUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || disabled) return;

    try {
      setUploading(true);
      setError(null);

      // Upload file directly to Storage under certificate-templates/{templateId}/{assetType}_...
      const res = await certificateService.uploadTemplateAsset(file, templateId, assetType);
      
      onAssetChange({
        storagePath: res.storagePath,
        downloadUrl: res.downloadUrl,
      });
    } catch (err: any) {
      console.error(`[AssetUploader] Error uploading ${assetType}:`, err);
      setError(err?.message || "Failed to upload asset file.");
    } finally {
      setUploading(false);
      // Reset input value so re-selecting same file triggers change if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <label className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
          <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
          {label}
        </label>
        {currentAsset?.downloadUrl && onClearAsset && !disabled && (
          <button
            type="button"
            onClick={onClearAsset}
            className="text-[10px] text-red-500 hover:underline flex items-center gap-0.5"
          >
            <X className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="hidden"
      />

      <div
        onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
        className={`border border-dashed rounded-2xl p-3 text-center cursor-pointer transition-all flex items-center justify-between gap-3 ${
          currentAsset?.downloadUrl
            ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500"
            : "border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 hover:border-amber-500"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          {uploading ? (
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin flex-shrink-0" />
          ) : currentAsset?.downloadUrl ? (
            <img
              src={currentAsset.downloadUrl}
              alt={label}
              className="w-9 h-9 object-contain rounded-lg border border-emerald-500/30 bg-white dark:bg-gray-950 flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Upload className="w-4 h-4" />
            </div>
          )}

          <div className="text-left truncate">
            {uploading ? (
              <p className="font-bold text-amber-600 text-xs">Uploading to Storage...</p>
            ) : currentAsset?.downloadUrl ? (
              <div>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" /> Uploaded to Storage
                </p>
                <p className="text-[10px] text-gray-400 truncate">Click to replace file</p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">Choose Image File</p>
                <p className="text-[10px] text-gray-400">PNG, JPG, WEBP, SVG</p>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          disabled={uploading || disabled}
          className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-[11px] font-bold rounded-xl flex-shrink-0"
        >
          {currentAsset?.downloadUrl ? "Replace" : "Browse"}
        </button>
      </div>

      {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
    </div>
  );
}
