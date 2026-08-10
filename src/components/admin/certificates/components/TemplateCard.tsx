"use client";

import React from "react";
import { Edit3, Star, Copy, Trash2, CheckCircle2, ShieldCheck, Eye, Sparkles } from "lucide-react";
import { CertificateTemplate } from "@/services/certificateService";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: CertificateTemplate;
  viewMode?: "grid" | "list";
  onOpenStudio: (template: CertificateTemplate) => void;
  onPublishToggle: (template: CertificateTemplate) => void;
  onSetDefault: (template: CertificateTemplate) => void;
  onDuplicate: (template: CertificateTemplate) => void;
  onArchive: (template: CertificateTemplate) => void;
  onDelete: (template: CertificateTemplate) => void;
}

export function TemplateCard({
  template,
  viewMode = "grid",
  onOpenStudio,
  onPublishToggle,
  onSetDefault,
  onDuplicate,
  onArchive,
  onDelete,
}: TemplateCardProps) {
  const name = template.name || "Untitled Template";
  const status = template.status || "Draft";
  const category = template.category || "Completion";
  const isDefault = template.isDefault;
  const usageCount = template.usageCount || 0;
  const bgUrl = template.canvas?.backgroundImageUrl || template.assets?.background?.downloadUrl;

  if (viewMode === "list") {
    return (
      <div className="glass-card p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-amber-500/40 transition-all">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-16 h-12 rounded-xl overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-200 dark:border-gray-800 relative">
            <img
              src={bgUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80"}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white">{name}</h4>
              {isDefault && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 fill-current" /> Default
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold">{category}</span>
              <span>v{template.version || 1}</span>
              <span>•</span>
              <span className="text-emerald-600 font-semibold">Used {usageCount} times</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-bold text-white",
              status === "Published" ? "bg-emerald-500" : status === "Archived" ? "bg-gray-600" : "bg-blue-500"
            )}
          >
            {status}
          </span>

          <button
            onClick={() => onOpenStudio(template)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit
          </button>

          <button
            onClick={() => onPublishToggle(template)}
            className={cn(
              "px-3 py-1.5 font-bold text-xs rounded-xl transition-all cursor-pointer",
              status === "Published"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {status === "Published" ? "Unpublish" : "Publish"}
          </button>

          <button
            onClick={() => onDuplicate(template)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(template)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl cursor-pointer"
            title="Delete / Archive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card rounded-3xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between group shadow-sm hover:shadow-xl transition-all"
    >
      <div className="relative h-44 overflow-hidden bg-gray-950">
        <img
          src={bgUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200&auto=format&fit=crop&q=80"}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isDefault && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white backdrop-blur-md shadow-md flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Default
            </span>
          )}
          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white backdrop-blur-md shadow-sm",
              status === "Published" ? "bg-emerald-500/90" : status === "Archived" ? "bg-gray-600/90" : "bg-blue-500/90"
            )}
          >
            {status}
          </span>
        </div>

        {usageCount > 0 && (
          <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-emerald-300 backdrop-blur-md border border-emerald-500/30 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Used {usageCount} times
          </div>
        )}
      </div>

      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {category}
            </span>
            <span className="text-[10px] font-semibold text-gray-400">v{template.version || 1}</span>
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white text-base mt-2 line-clamp-1">{name}</h4>
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-1.5">
          <button
            onClick={() => onOpenStudio(template)}
            className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all text-center cursor-pointer shadow-sm flex items-center justify-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Open Studio
          </button>

          <button
            onClick={() => onPublishToggle(template)}
            className={cn(
              "px-3 py-2 text-xs font-bold rounded-xl cursor-pointer transition-all",
              status === "Published"
                ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
            title={status === "Published" ? "Unpublish Template" : "Publish Template"}
          >
            {status === "Published" ? "Unpublish" : "Publish"}
          </button>

          {!isDefault && status !== "Archived" && (
            <button
              onClick={() => onSetDefault(template)}
              className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-xl cursor-pointer"
              title="Set Default"
            >
              <Star className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onDuplicate(template)}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(template)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl cursor-pointer"
            title="Delete / Archive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
