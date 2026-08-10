"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AnnouncementBannerProps {
  bannerText?: string;
  linkHref?: string;
  onBannerClick?: () => void;
}

export function AnnouncementBanner({
  bannerText = "🔥 HackQuest 2026 registrations close tomorrow →",
  linkHref = "#events",
  onBannerClick,
}: AnnouncementBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  const handleBannerClick = () => {
    if (onBannerClick) {
      onBannerClick();
    } else {
      const el = document.getElementById("events");
      if (el) {
        const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-semibold py-2 px-4 flex items-center justify-between relative z-40 shadow-xs cursor-pointer select-none"
        onClick={handleBannerClick}
      >
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-2 pr-6">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
          <span className="truncate hover:underline tracking-tight">
            {bannerText}
          </span>
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 rounded-full hover:bg-white/20 active:scale-95 transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5 text-white/90" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
