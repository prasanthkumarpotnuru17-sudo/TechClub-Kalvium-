"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  title: string | React.ReactNode;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeader({
  badgeText,
  badgeIcon,
  title,
  subtitle,
  align = "center",
  className,
}: SectionHeaderProps) {
  const getAlignStyles = () => {
    switch (align) {
      case "left":
        return "text-left items-start";
      case "right":
        return "text-right items-end";
      case "center":
      default:
        return "text-center items-center mx-auto";
    }
  };

  return (
    <div className={cn("max-w-3xl flex flex-col space-y-4 mb-12", getAlignStyles(), className)}>
      {badgeText && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold shadow-2xs select-none">
          {badgeIcon}
          {badgeText}
        </span>
      )}

      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display">
        {title}
      </h2>

      {subtitle && (
        <p className="text-sm md:text-base text-slate-400 leading-relaxed font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
