"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface StickyMobileCTAProps {
  onJoinClick: () => void;
}

export function StickyMobileCTA({ onJoinClick }: StickyMobileCTAProps) {
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowSticky(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleExploreClick = () => {
    const el = document.getElementById("events");
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <AnimatePresence>
      {showSticky && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="fixed bottom-4 left-4 right-4 z-40 md:hidden mb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="bg-white/90 backdrop-blur-2xl border border-gray-200/90 shadow-2xl rounded-2xl p-2.5 flex items-center justify-between gap-2.5 ring-1 ring-black/5">
            <button
              onClick={handleExploreClick}
              className="flex-1 min-h-[48px] bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Explore Events
            </button>
            
            <button
              onClick={onJoinClick}
              className="flex-1 min-h-[48px] bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer shadow-md shadow-blue-500/20"
            >
              Join Club
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
