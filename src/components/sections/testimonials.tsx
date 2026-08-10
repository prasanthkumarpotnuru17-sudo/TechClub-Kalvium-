"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Testimonial {
  id: string;
  name: string;
  department: string;
  rating: number;
  review: string;
  avatarInitials: string;
  avatarBg: string;
}

export function Testimonials() {
  const testimonialsList: Testimonial[] = [
    {
      id: "t-1",
      name: "Arjun Mehta",
      department: "B.Tech Computer Science (Batch of 2026)",
      rating: 5,
      review: "Tech Club by Kalvium was the catalyst for my engineering journey. I went from writing basic Python scripts to architecting distributed system networks. The direct referral pipeline helped me secure a SWE internship at Vercel!",
      avatarInitials: "AM",
      avatarBg: "from-blue-600 to-indigo-600",
    },
    {
      id: "t-2",
      name: "Sophia Lin",
      department: "M.Tech Data Science (Batch of 2025)",
      rating: 5,
      review: "The cohort study groups here are unmatched. Instead of dry college slides, we focused on training neural networks on GPU clusters. The mentorship from senior club board members is highly practical and structured.",
      avatarInitials: "SL",
      avatarBg: "from-purple-600 to-pink-500",
    },
    {
      id: "t-3",
      name: "Devon Carter",
      department: "B.Tech Electronics & Robotics (Batch of 2026)",
      rating: 5,
      review: "Hardware prototyping can feel isolated, but Tech Club by Kalvium provided me with mesh node kits, soldering gear, and IoT sensors to collaborate on. Building smart agriculture nodes with domain leads was an incredible experience.",
      avatarInitials: "DC",
      avatarBg: "from-orange-500 to-amber-500",
    },
    {
      id: "t-4",
      name: "Maria Rodriguez",
      department: "B.Tech Cybersecurity (Batch of 2026)",
      rating: 5,
      review: "The weekly CTF capture-the-flag sprints prepared me directly for industry security challenges. The networking connections from Google and Stripe speakers helped refine my secure systems audit portfolio.",
      avatarInitials: "MR",
      avatarBg: "from-emerald-500 to-teal-500",
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  // Auto sliding
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonialsList.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [testimonialsList.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + testimonialsList.length) % testimonialsList.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % testimonialsList.length);
  };

  const current = testimonialsList[activeIndex];

  return (
    <section className="relative py-24 bg-slate-50/50 overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full radial-glow-blue opacity-40 pointer-events-none" />

      <div className="container mx-auto max-w-5xl px-4 md:px-6 relative z-10">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Testimonials
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            What Our Members Say
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            Hear from students who built projects, learned advanced frameworks, and launched careers.
          </p>
        </div>

        {/* Carousel Slider */}
        <div className="relative w-full max-w-4xl mx-auto">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <Card className="rounded-[36px] bg-white border border-gray-200/60 p-8 md:p-12 shadow-md relative overflow-hidden">
                {/* Huge back quote icon */}
                <Quote className="absolute right-8 top-8 h-24 w-24 text-gray-50 pointer-events-none z-0" />

                <CardContent className="p-0 relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
                  
                  {/* Avatar / Profile section */}
                  <div className="flex flex-col items-center text-center space-y-3 min-w-[180px]">
                    <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${current.avatarBg} flex items-center justify-center text-white text-3xl font-black tracking-tight shadow-lg shadow-blue-500/10`}>
                      {current.avatarInitials}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-gray-950 text-lg leading-tight">
                        {current.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-bold tracking-wide uppercase mt-1 leading-snug">
                        {current.department}
                      </p>
                    </div>
                  </div>

                  {/* Review Text & Rating */}
                  <div className="flex-grow space-y-6 text-center md:text-left">
                    {/* Stars */}
                    <div className="flex items-center justify-center md:justify-start gap-1">
                      {[...Array(current.rating)].map((_, i) => (
                        <Star key={i} className="h-4.5 w-4.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    {/* Quote */}
                    <p className="text-sm md:text-base lg:text-lg text-gray-600 leading-relaxed font-medium italic">
                      &ldquo;{current.review}&rdquo;
                    </p>
                  </div>

                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3 mt-8">
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
                aria-label="Previous review"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={handleNext}
                className="p-3 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all duration-200 cursor-pointer shadow-sm"
                aria-label="Next review"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
            
            {/* Dots */}
            <div className="hidden md:flex gap-1.5 items-center mr-2">
              {testimonialsList.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeIndex === idx ? "w-6 bg-gray-900" : "w-2 bg-gray-200"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
