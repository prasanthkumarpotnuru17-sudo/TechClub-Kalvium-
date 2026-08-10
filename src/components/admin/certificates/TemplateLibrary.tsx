"use client";

import React, { useState } from "react";
import { Search, Filter, Plus, LayoutGrid, List, SlidersHorizontal, Sparkles } from "lucide-react";
import { CertificateTemplate, certificateService } from "@/services/certificateService";
import { TemplateCard } from "./components/TemplateCard";

interface TemplateLibraryProps {
  templates: CertificateTemplate[];
  onOpenStudio: (template?: CertificateTemplate) => void;
  onPublishToggle: (template: CertificateTemplate) => void;
  onSetDefault: (template: CertificateTemplate) => void;
  onDuplicate: (template: CertificateTemplate) => void;
  onArchive: (template: CertificateTemplate) => void;
  onDelete: (template: CertificateTemplate) => void;
}

export function TemplateLibrary({
  templates,
  onOpenStudio,
  onPublishToggle,
  onSetDefault,
  onDuplicate,
  onArchive,
  onDelete,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState<"updated" | "published" | "name" | "used">("updated");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtering
  const filtered = certificateService.searchTemplates(templates, searchQuery, categoryFilter, statusFilter);

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "used") {
      return (b.usageCount || 0) - (a.usageCount || 0);
    }
    if (sortBy === "published") {
      const aTime = a.lastPublishedAt?.seconds || 0;
      const bTime = b.lastPublishedAt?.seconds || 0;
      return bTime - aTime;
    }
    // Default: Recently Updated
    const aTime = a.updatedAt?.seconds || 0;
    const bTime = b.updatedAt?.seconds || 0;
    return bTime - aTime;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="glass-card p-4 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates by name..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs px-2.5 py-1.5 focus:outline-none text-gray-700 dark:text-gray-300 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Published">Published</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-xs px-2.5 py-1.5 focus:outline-none text-gray-700 dark:text-gray-300 font-medium"
            >
              <option value="updated">Recently Updated</option>
              <option value="published">Recently Published</option>
              <option value="used">Most Used</option>
              <option value="name">Name</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "grid" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1 rounded-lg transition-all ${
                viewMode === "list" ? "bg-amber-600 text-white" : "text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* AI Designer & New Template Buttons */}
          <button
            onClick={() => onOpenStudio()}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            AI Designer
          </button>

          <button
            onClick={() => onOpenStudio()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Cards Container */}
      {sorted.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-3">
          <p className="font-bold text-sm text-gray-800 dark:text-gray-200">No Templates Found</p>
          <p className="text-xs text-gray-500">Try adjusting your search query or filters, or create a new template.</p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 gap-6" : "space-y-3"
          }
        >
          {sorted.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              viewMode={viewMode}
              onOpenStudio={onOpenStudio}
              onPublishToggle={onPublishToggle}
              onSetDefault={onSetDefault}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
