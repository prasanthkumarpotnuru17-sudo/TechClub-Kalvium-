"use client";

import React from "react";
import { Layers, CheckCircle, ShieldCheck, Star, Send } from "lucide-react";
import { CertificateTemplate, IssuedCertificateDoc } from "@/services/certificateService";

interface DashboardViewProps {
  templates: CertificateTemplate[];
  issuedCerts: IssuedCertificateDoc[];
  onLaunchWizard: () => void;
}

export function DashboardView({ templates, issuedCerts, onLaunchWizard }: DashboardViewProps) {
  const publishedCount = templates.filter((t) => t.status === "Published" && !t.isDeleted).length;
  const defaultTemplateDoc = templates.find((t) => t.isDefault && !t.isDeleted);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Templates</p>
            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{templates.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Published Templates</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{publishedCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Issued Credentials</p>
            <h3 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{issuedCerts.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Default Template</p>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
              {defaultTemplateDoc ? defaultTemplateDoc.name : "None Set"}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="glass-card p-6 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center justify-center md:justify-start gap-2">
            <Send className="w-5 h-5 text-amber-500" />
            Issue Certificates Workflow
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
            Select an event, load verified attendees, pick a published template, and generate official credentials with instant PDF rendering.
          </p>
        </div>
        <button
          onClick={onLaunchWizard}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-2xl shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <Send className="w-4 h-4" />
          Launch Issue Wizard
        </button>
      </div>
    </div>
  );
}
