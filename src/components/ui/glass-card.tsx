"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "gradient" | "dark";
  interactive?: boolean;
}

export function GlassCard({
  children,
  variant = "default",
  interactive = false,
  className,
  ...props
}: GlassCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "subtle":
        return "bg-slate-900/60 border-slate-800/80 shadow-xs text-white";
      case "gradient":
        return "bg-gradient-to-br from-slate-900 via-blue-950/40 to-indigo-950/30 border-blue-500/30 shadow-md text-white";
      case "dark":
      case "default":
      default:
        return "bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-xl text-white";
    }
  };

  return (
    <div
      className={cn(
        "rounded-3xl border transition-all duration-300",
        getVariantStyles(),
        interactive && "hover:border-blue-300 hover:shadow-xl active:scale-[0.99] cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
