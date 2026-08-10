"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Drawer({ isOpen, onClose, title = "Navigation Menu", children }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs xl:hidden"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white/95 backdrop-blur-2xl flex flex-col justify-between p-6 shadow-2xl xl:hidden overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between py-2 border-b border-gray-100 mb-4">
              <span className="font-display font-bold text-gray-900 text-lg">
                {title}
              </span>
              <button
                onClick={onClose}
                className="min-h-[48px] min-w-[48px] p-2.5 rounded-full text-gray-600 bg-gray-100 hover:bg-gray-200 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
