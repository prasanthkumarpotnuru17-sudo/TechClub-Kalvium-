"use client";

import React from "react";
import { useScroll, useSpring, motion } from "framer-motion";

export function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 z-50 origin-left pointer-events-none"
      style={{ scaleX }}
      role="progressbar"
      aria-label="Page scroll progress"
    />
  );
}
