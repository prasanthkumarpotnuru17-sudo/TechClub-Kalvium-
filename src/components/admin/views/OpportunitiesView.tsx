"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Plus,
  Search,
  ExternalLink,
  MapPin,
  Clock,
  DollarSign,
  Trash2,
  Edit2,
  CheckCircle
} from "lucide-react";
import { mockOpportunities, OpportunityItem } from "@/lib/services/mockData";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface OpportunitiesViewProps {
  onOpenAddModal: () => void;
}

export function OpportunitiesView({ onOpenAddModal }: OpportunitiesViewProps) {
  const [opps, setOpps] = useState<OpportunityItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMode, setSelectedMode] = useState("All");

  const filteredOpps = opps.filter((o) => {
    const matchesMode = selectedMode === "All" || o.mode === selectedMode;
    const matchesSearch =
      (o.title ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.companyOrOrg ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.type ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMode && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (confirm("Remove opportunity listing?")) {
      setOpps((prev) => prev.filter((o) => o.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {["All", "Online", "Offline", "Hybrid"].map((mode) => (
            <button
              key={mode}
              onClick={() => setSelectedMode(mode)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer",
                selectedMode === mode
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {mode}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-purple-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Opportunity
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search external hackathons, internships, GSoC..."
          className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
      </div>

      {/* Opportunities List Grid */}
      {filteredOpps.length === 0 ? (
        <div className="p-12 text-center text-gray-500 dark:text-gray-400 glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col items-center justify-center space-y-2">
          <Briefcase className="w-8 h-8 text-gray-400" />
          <p className="font-semibold text-sm">No listings found matching the filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOpps.map((opp) => (
            <motion.div
              key={opp.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card glass-card-hover rounded-3xl p-5 border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between space-y-4 group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    {opp.type}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                    {opp.mode}
                  </span>
                </div>

                <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {opp.title}
                </h3>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                  {opp.companyOrOrg}
                </p>

                <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{opp.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{opp.stipendOrPrize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Deadline: {opp.deadline}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                <a
                  href={opp.applyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  Apply Page
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleDelete(opp.id)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                  title="Delete Opportunity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
