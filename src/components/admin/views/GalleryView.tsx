"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Plus, Trash2, Eye, Heart, X, Sparkles } from "lucide-react";
import { GalleryItem } from "@/lib/services/mockData";
import { galleryService } from "@/services/galleryService";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GalleryViewProps {
  onOpenUploadModal: () => void;
}

export function GalleryView({ onOpenUploadModal }: GalleryViewProps) {
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [selectedCat, setSelectedCat] = useState("All");
  const [previewPhoto, setPreviewPhoto] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const unsub = galleryService.subscribeGallery((data) => {
      setPhotos(data);
    });
    return () => unsub();
  }, []);

  const categories = ["All", "Workshops", "Hackathons", "Cultural", "Industry Talks", "Team Building"];

  const filteredPhotos = photos.filter(
    (p) => selectedCat === "All" || p.category === selectedCat
  );

  const handleDelete = async (id: string) => {
    if (confirm("Delete photo from event gallery?")) {
      await galleryService.deleteGalleryImage(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            Event Photo Gallery Management
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Curate high-res event photography for website and student portals.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Upload Photo
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer",
              selectedCat === cat
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredPhotos.map((photo) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-2xl overflow-hidden border border-gray-200/60 dark:border-gray-800/60 group relative"
          >
            <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800">
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4 justify-between">
                <button
                  onClick={() => setPreviewPhoto(photo)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="Full Screen Preview"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3.5 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{photo.category}</span>
                <span className="text-gray-400">{photo.eventDate}</span>
              </div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{photo.title}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {previewPhoto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl"
            >
              <button
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 z-10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewPhoto.imageUrl}
                alt={previewPhoto.title}
                className="w-full max-h-[75vh] object-contain bg-black"
              />
              <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">{previewPhoto.title}</h3>
                  <p className="text-xs text-gray-400">
                    {previewPhoto.category} • {previewPhoto.eventDate}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20">
                  <Heart className="w-4 h-4 fill-red-400" />
                  {previewPhoto.likes} Likes
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
