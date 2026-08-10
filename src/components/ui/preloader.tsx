"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Global module state: tracks if preloader has already played in current JS session
let hasPlayedInSession = false;

export function Preloader() {
  const [shouldShow, setShouldShow] = useState(false);
  const [stage, setStage] = useState<"popup" | "hold" | "zoom" | "done">("popup");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if the current execution is a true browser page refresh (F5 / reload button)
    let isReload = false;
    try {
      const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
      if (navEntries && navEntries.length > 0) {
        isReload = navEntries[0].type === "reload";
      }
    } catch (e) {
      isReload = false;
    }

    // Play preloader ONLY on fresh session launch or true browser page refresh (F5)
    // NEVER play on client-side navbar/link clicks
    if (!hasPlayedInSession || isReload) {
      hasPlayedInSession = true;
      setShouldShow(true);

      // 1. Brief hold stage
      const holdTimer = setTimeout(() => {
        setStage("hold");
      }, 700);

      // 2. Dramatic Zoom In transition
      const zoomTimer = setTimeout(() => {
        setStage("zoom");
      }, 1700);

      // 3. Reveal website & complete
      const doneTimer = setTimeout(() => {
        setStage("done");
        setShouldShow(false);
      }, 2350);

      return () => {
        clearTimeout(holdTimer);
        clearTimeout(zoomTimer);
        clearTimeout(doneTimer);
      };
    }
  }, []);

  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      {stage !== "done" && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1 }}
          animate={
            stage === "zoom"
              ? { 
                  opacity: 0, 
                  transition: { duration: 0.65, ease: [0.7, 0, 0.84, 0] } 
                }
              : { opacity: 1 }
          }
          className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white pointer-events-none overflow-hidden select-none"
        >
          {/* Light Theme Background Ambient Radial Glow */}
          <motion.div
            animate={
              stage === "zoom"
                ? { scale: 4, opacity: 0 }
                : { scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }
            }
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-blue-400/20 via-indigo-300/25 to-red-300/20 rounded-full blur-[100px]"
          />

          {/* Crisp Technical Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

          {/* Main Logo Container: Pop-up -> Hold -> Dramatic Zoom In Reveal */}
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={
              stage === "popup"
                ? { scale: 1, opacity: 1, y: 0 }
                : stage === "hold"
                ? { scale: 1.02, opacity: 1, y: 0 }
                : { scale: 24, opacity: 0, y: 0 }
            }
            transition={
              stage === "popup"
                ? { type: "spring", stiffness: 320, damping: 18 }
                : stage === "hold"
                ? { duration: 0.8, ease: "easeInOut" }
                : { duration: 0.65, ease: [0.645, 0.045, 0.355, 1] }
            }
            className="relative z-10 flex flex-col items-start leading-none group"
          >
            {/* Pop-up Brand Name */}
            <span className="font-display font-extrabold tracking-tight text-slate-950 text-6xl md:text-8xl drop-shadow-xs">
              Tech Club
            </span>

            {/* Pop-up Tagline Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 400, damping: 16 }}
              className="text-sm md:text-base font-bold text-red-600 self-end -mt-1 tracking-wider uppercase bg-red-50/90 border border-red-200/80 px-3 py-1 rounded-full shadow-xs"
            >
              Kalvium
            </motion.span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
