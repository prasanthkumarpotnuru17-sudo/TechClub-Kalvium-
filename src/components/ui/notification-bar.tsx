"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBannerItem, mockNotificationBanners } from "@/lib/services/mockData";

interface NotificationBarProps {
  banner?: NotificationBannerItem;
  onBannerClick?: () => void;
}

export function NotificationBar({
  banner,
  onBannerClick,
}: NotificationBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!banner) return;
    try {
      const dismissedKey = `notif_banner_${banner.id}_dismissed`;
      const isDismissed = localStorage.getItem(dismissedKey);
      if (isDismissed === "true") {
        setIsVisible(false);
      }
    } catch {
      // LocalStorage fallback
    }
  }, [banner]);

  if (!banner || !isVisible) return null;

  // Check expiry date
  if (banner.expiresAt && new Date(banner.expiresAt) < new Date()) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    try {
      localStorage.setItem(`notif_banner_${banner.id}_dismissed`, "true");
    } catch {
      // LocalStorage fallback
    }
  };

  const handleClick = () => {
    if (onBannerClick) {
      onBannerClick();
    } else if (banner.buttonLink) {
      if (banner.buttonLink.startsWith("#")) {
        const el = document.getElementById(banner.buttonLink.substring(1));
        if (el) {
          const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
          window.scrollTo({ top, behavior: "smooth" });
        }
      } else {
        window.open(banner.buttonLink, "_blank");
      }
    }
  };

  const getThemeStyles = () => {
    switch (banner.type) {
      case "warning":
        return "bg-amber-600 text-amber-950 border-amber-500";
      case "success":
        return "bg-emerald-600 text-white border-emerald-500";
      case "maintenance":
        return "bg-red-600 text-white border-red-500";
      case "event":
      default:
        return "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-indigo-500";
    }
  };

  const getIcon = () => {
    switch (banner.type) {
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />;
      case "maintenance":
        return <ShieldAlert className="w-3.5 h-3.5 text-red-200 shrink-0" />;
      case "event":
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`w-full ${getThemeStyles()} text-xs sm:text-sm font-semibold py-2 px-4 flex items-center justify-between relative z-40 shadow-xs cursor-pointer select-none`}
        onClick={handleClick}
        role="region"
        aria-label="Announcement banner"
      >
        <div className="container mx-auto max-w-7xl flex items-center justify-center gap-2 pr-6">
          {getIcon()}
          <span className="truncate hover:underline tracking-tight">
            <strong>{banner.title}:</strong> {banner.message}{" "}
            {banner.buttonText && <span className="underline ml-1">{banner.buttonText}</span>}
          </span>
        </div>

        {banner.dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-white/20 active:scale-95 transition-colors cursor-pointer shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Dismiss announcement"
          >
            <X className="w-3.5 h-3.5 text-white/90" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
