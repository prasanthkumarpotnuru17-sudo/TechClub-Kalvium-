"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Calendar, User } from "lucide-react";
import Image from "next/image";
import { GalleryPhotoItem } from "@/lib/services/mockData";
import { galleryService } from "@/services/galleryService";
import { SectionHeader } from "@/components/ui/section-header";

interface GalleryProps {
  items?: GalleryPhotoItem[];
}

export function Gallery({ items }: GalleryProps) {
  const [galleryItems, setGalleryItems] = useState<GalleryPhotoItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhotoItem | null>(null);

  useEffect(() => {
    if (items) {
      setGalleryItems(items);
    } else {
      galleryService.getGallery().then((data) => {
        setGalleryItems(data);
      });
    }
  }, [items]);

  const categories = ["All", "Workshops", "Hackathons", "Industry Talks", "Team Building"];

  const filteredPhotos = activeCategory === "All"
    ? galleryItems
    : galleryItems.filter((p) => p.category === activeCategory);

  return (
    <section id="gallery" className="relative py-20 md:py-24 bg-white border-t border-gray-100">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        
        {/* Section Heading */}
        <SectionHeader
          badgeText="Gallery Showcase"
          title="Life at Tech Club by Kalvium"
          subtitle="Moments captured across our developer cohorts, hackathon build sprints, speaker keynotes, and hardware labs."
        />

        {/* Category Filter Chips (Horizontal scrollable on mobile) */}
        <div className="flex items-center gap-2 mb-10 pb-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0 sm:justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 border cursor-pointer select-none shrink-0 min-h-[44px] active:scale-95 ${
                activeCategory === cat
                  ? "bg-gray-900 text-white border-gray-900 shadow-md"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pinterest-style Masonry Grid (2 columns on mobile, 3 columns on desktop) */}
        <motion.div
          layout
          className="columns-2 md:columns-3 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredPhotos.map((photo) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                key={photo.id}
                onClick={() => setSelectedPhoto(photo)}
                className="break-inside-avoid group cursor-pointer"
              >
                <div className={`relative ${photo.heightClass || "h-60"} rounded-2xl md:rounded-3xl overflow-hidden border border-gray-200/80 bg-slate-100 shadow-xs hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02]`}>
                  <Image
                    src={photo.src}
                    alt={photo.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Card Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5 md:p-5 text-white space-y-1">
                    <span className="text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                      {photo.category}
                    </span>
                    <h4 className="text-xs md:text-sm font-bold leading-snug line-clamp-2 pt-1">
                      {photo.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-gray-300 pt-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        {photo.date}
                      </span>
                      <span className="flex items-center gap-1 font-extrabold text-pink-400">
                        <Heart className="w-3 h-3 fill-current" />
                        {photo.likes}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Modal Lightbox Preview */}
        <AnimatePresence>
          {selectedPhoto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-lg w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-white"
              >
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="absolute top-4 right-4 z-20 min-h-[44px] min-w-[44px] rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="relative w-full h-80 bg-slate-950">
                  <Image
                    src={selectedPhoto.src}
                    alt={selectedPhoto.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {selectedPhoto.category}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {selectedPhoto.date}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-display text-white">{selectedPhoto.title}</h3>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-gray-400">
                    <span className="flex items-center gap-1 font-bold text-pink-400">
                      <Heart className="w-4 h-4 fill-current" />
                      {selectedPhoto.likes} Likes
                    </span>
                    <span className="text-gray-400 font-semibold">Tech Club Archives</span>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
