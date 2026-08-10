"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  // Close on Escape key press
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden"; // Lock scroll
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset"; // Unlock scroll
    };
  }, [isOpen, onClose]);

  const modalRef = useOutsideClick<HTMLDivElement>(onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{
              type: "spring",
              duration: 0.5,
              bounce: 0.15,
            }}
            ref={modalRef}
            className={cn(
              "relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white/95 backdrop-blur-xl p-6 md:p-8 outline-none border border-gray-200/80 shadow-2xl",
              className
            )}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title */}
            {title && (
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-950 mb-4 pr-6">
                {title}
              </h2>
            )}

            {/* Content */}
            <div className="text-gray-600">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
