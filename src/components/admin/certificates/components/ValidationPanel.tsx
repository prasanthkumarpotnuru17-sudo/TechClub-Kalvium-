"use client";

import React from "react";
import { CheckCircle2, AlertCircle, ShieldAlert, Sparkles, XCircle } from "lucide-react";
import { certificateService, CertificateTemplate } from "@/services/certificateService";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
  template: Partial<CertificateTemplate>;
}

export function ValidationPanel({ template }: ValidationPanelProps) {
  const health = certificateService.checkTemplateHealth(template);

  const ruleItems = [
    { label: "Template Name", ok: health.rules.hasName },
    { label: "Background Canvas Image", ok: health.rules.hasBackground },
    { label: "{{participant_name}} Placeholder", ok: health.rules.hasParticipantName },
    { label: "{{event_name}} Placeholder", ok: health.rules.hasEventName },
    { label: "{{certificate_number}} Placeholder", ok: health.rules.hasCertNumber },
    { label: "{{issue_date}} Placeholder", ok: health.rules.hasIssueDate },
  ];

  return (
    <div className="glass-card p-4 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className={cn("w-4 h-4", health.isReadyToPublish ? "text-emerald-500" : "text-amber-500")} />
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Template Health Check
          </h4>
        </div>
        <span
          className={cn(
            "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full backdrop-blur-md",
            health.isReadyToPublish
              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
          )}
        >
          {health.score} / {health.totalRules} ({health.percentage}%) • {health.isReadyToPublish ? "Ready to Publish" : "Draft Only"}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500 rounded-full",
            health.isReadyToPublish ? "bg-emerald-500" : health.score >= 4 ? "bg-amber-500" : "bg-red-500"
          )}
          style={{ width: `${health.percentage}%` }}
        />
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
        {ruleItems.map((item, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-1.5 p-1.5 rounded-xl border transition-all",
              item.ok
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400"
            )}
          >
            {item.ok ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className="truncate font-semibold">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Missing Items Alert if Any */}
      {!health.isReadyToPublish && health.missingItems.length > 0 && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            Action Required before Publishing:
          </p>
          <ul className="list-disc list-inside text-[11px] space-y-0.5 pl-1 opacity-90">
            {health.missingItems.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
