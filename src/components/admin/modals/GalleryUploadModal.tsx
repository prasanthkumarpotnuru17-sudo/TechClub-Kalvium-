"use client";

import React, { useState } from "react";
import { X, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";

interface GalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (photoData: any) => void;
}

export function GalleryUploadModal({ isOpen, onClose, onUpload }: GalleryUploadModalProps) {
  const [form, setForm] = useState({
    title: "",
    imageUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80",
    category: "Workshops" as any,
    eventDate: "Jul 22, 2026",
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.imageUrl) return;
    onUpload(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-500" />
          Upload Event Photo
        </h3>
        <p className="text-xs text-gray-500 mb-6">Add high-resolution photography to the public event gallery.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Photo Caption / Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. AI Hackathon Grand Finale Presentation"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="Workshops">Workshops</option>
                <option value="Hackathons">Hackathons</option>
                <option value="Cultural">Cultural</option>
                <option value="Industry Talks">Industry Talks</option>
                <option value="Team Building">Team Building</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Event Date</label>
              <input
                type="text"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Image URL / Unsplash Link</label>
            <input
              type="text"
              required
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white font-mono text-xs"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-500/20"
            >
              Upload Photo
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
