"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { 
  Droplet, GitBranch, BarChart3, GitFork, ArrowRight, Play, Users 
} from "lucide-react";
import Image from "next/image";
import { 
  FeaturedEventData, 
  HeroStatisticItem, 
  mockFeaturedEvent
} from "@/lib/services/mockData";
import { GlassCard } from "@/components/ui/glass-card";
import { StatisticsSection } from "@/components/sections/statistics";

// Smooth count-up helper component
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1800; // 1.8 seconds
    const end = target;
    const increment = Math.ceil(end / (duration / 16)); // ~60fps
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

interface HeroProps {
  onJoinClick: () => void;
  onRegisterClick?: (eventTitle: string) => void;
  featuredEvent?: FeaturedEventData;
  statistics?: HeroStatisticItem[];
}

export function Hero({
  onJoinClick,
  onRegisterClick,
  featuredEvent = mockFeaturedEvent,
  statistics = [],
}: HeroProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleScrollToEvents = () => {
    const el = document.getElementById("events");
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <section id="home" className="relative min-h-screen pt-28 pb-12 md:pt-32 lg:pt-36 flex items-center overflow-hidden bg-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[300px] sm:w-[350px] h-[300px] sm:h-[350px] rounded-full bg-blue-500/[0.03] blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] sm:w-[450px] h-[350px] sm:h-[450px] rounded-full bg-indigo-500/[0.03] blur-3xl pointer-events-none" />
      </div>

      <div className="mx-auto max-w-[1650px] px-6 md:px-12 xl:px-20 2xl:px-28 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 items-center">
          
          {/* LEFT SIDE: Cobutec Composition Layout (5 Columns on Desktop) */}
          <div className="order-2 lg:order-1 lg:col-span-5 xl:col-span-5 flex items-center justify-center min-h-[420px] lg:min-h-[540px] relative mt-4 lg:mt-0">
            {/* Desktop Illustration (lg and up) */}
            <div className="hidden lg:block relative w-full max-w-[430px] xl:max-w-[440px] h-[550px] select-none">
              
              {/* Connection Lines (SVG) */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" xmlns="http://www.w3.org/2000/svg">
                {/* Horizontal Connection: Card 1 (VR Headset) to Card 2 (Topography) */}
                <line x1="140" y1="85" x2="220" y2="85" stroke="black" strokeWidth="3.5" strokeLinecap="butt" />
                <circle cx="180" cy="85" r="6" fill="black" />
                

                {/* Vertical Connection: Card 3 (Silhouette) to Card 4 (Microchip) */}
                <line x1="75" y1="365" x2="75" y2="405" stroke="black" strokeWidth="3.5" strokeLinecap="butt" />
                <circle cx="75" cy="385" r="6" fill="black" />
                
                {/* Red dot accent in background hollow square */}
                <circle cx="215" cy="355" r="3.5" fill="#ef4444" />
              </svg>

              {/* Background Hollow Geometry Squares */}
              <div className="absolute top-[-10px] left-[-30px] w-26 h-26 rounded-[26px] border-2 border-gray-200/80 -z-10" />
              <div className="absolute top-[10px] left-[160px] w-12 h-12 rounded-[16px] border-2 border-gray-200/80 -z-10" />
              <div className="absolute top-[200px] left-[-20px] w-14 h-14 rounded-[18px] border-2 border-gray-200/80 -z-10" />
              <div className="absolute top-[320px] left-[180px] w-18 h-18 rounded-[22px] border-2 border-gray-200/80 -z-10" />
              <div className="absolute bottom-[-10px] right-[10px] w-18 h-18 rounded-[22px] border-2 border-gray-200/80 -z-10" />

              {/* Card 1: VR Headset */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute top-[20px] left-[10px] w-[130px] h-[130px] rounded-[30px] overflow-hidden border-[3.5px] border-black shadow-xl bg-pink-100 cursor-pointer hover:scale-102 transition-transform duration-350 z-20"
              >
                <Image src="/vr_headset_v2.png" alt="VR Headset Card" width={130} height={130} priority className="w-full h-full object-cover scale-[1.05]" />
              </motion.div>

              {/* Card 2: Topography */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="absolute top-[15px] left-[220px] w-[195px] h-[275px] rounded-[34px] bg-white border-[3.5px] border-black shadow-xl overflow-hidden cursor-pointer hover:scale-102 transition-transform duration-350 z-20"
              >
                <Image src="/topography_full_v3.png" alt="Topography Card" width={195} height={275} priority className="w-full h-full object-cover scale-[1.05]" />
              </motion.div>

              {/* Card 3: Silhouette */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute top-[175px] left-[10px] w-[130px] h-[190px] rounded-[30px] overflow-hidden border-[3.5px] border-black shadow-xl bg-black cursor-pointer hover:scale-102 transition-transform duration-350 z-20"
              >
                <Image
                  src="/silhouette_full_v3.png"
                  alt="Silhouette Card"
                  width={130}
                  height={190}
                  priority
                  className="w-full h-full object-cover scale-[1.05]"
                />
              </motion.div>

              {/* Card 4: Microchip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="absolute top-[405px] left-[0px] w-[180px] h-[118px] rounded-[30px] overflow-hidden border-[3.5px] border-black shadow-xl bg-neutral-900 cursor-pointer hover:scale-102 transition-transform duration-350 z-20"
              >
                <Image src="/microchip_v2.png" alt="Microchip Card" width={180} height={118} priority className="w-full h-full object-cover scale-[1.05]" />
              </motion.div>

              {/* Floating Metric & Icon Badges */}
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute top-[295px] left-[155px] w-12 h-12 bg-[#F59E0B] text-white rounded-[18px] flex items-center justify-center shadow-lg shadow-amber-500/25 border border-amber-400 z-30">
                <Droplet className="h-5.5 w-5.5 fill-current" />
              </motion.div>
              <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 0.5 }} className="absolute top-[370px] left-[250px] w-11 h-11 bg-black text-white rounded-[16px] flex items-center justify-center shadow-xl border border-neutral-800 z-30">
                <GitBranch className="h-5 w-5" />
              </motion.div>
              <motion.div animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut", delay: 0.8 }} className="absolute top-[450px] left-[165px] w-11 h-11 bg-gradient-to-tr from-indigo-600 to-purple-600 text-white rounded-[18px] flex items-center justify-center shadow-xl border border-indigo-500 z-30">
                <BarChart3 className="h-5 w-5" />
              </motion.div>
            </div>

            {/* Mobile Simplified Floating Cards Illustration (< lg) */}
            <div className="lg:hidden w-full max-w-sm mx-auto space-y-3 pt-2">
              <div className="text-center mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  Upcoming Cohorts & Sprints
                </span>
              </div>
              
              <div className="flex flex-col gap-2.5">
                {[
                  { title: "AI & Neural Nets Workshop", date: "Aug 02", badge: "AI/ML", color: "from-purple-500 to-indigo-600", icon: "🧠" },
                  { title: "HackQuest 2026 Build Sprint", date: "Aug 14-16", badge: "Hackathon", color: "from-blue-600 to-cyan-500", icon: "⚡" },
                  { title: "Cloud Infra & DevOps BootCamp", date: "Sep 08", badge: "Cloud", color: "from-emerald-500 to-teal-600", icon: "☁️" },
                  { title: "Cross-Platform Flutter Sprint", date: "Sep 22", badge: "Mobile", color: "from-amber-500 to-orange-600", icon: "📱" },
                  { title: "Cyber Security & CTF Audit Lab", date: "Oct 05", badge: "Security", color: "from-red-500 to-pink-600", icon: "🛡️" }
                ].map((item, idx) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: idx % 2 === 0 ? -15 : 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.08 }}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/90 border border-gray-200/80 shadow-xs backdrop-blur-md active:scale-98 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center text-sm shadow-xs font-bold`}>
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900 leading-tight">{item.title}</h4>
                        <span className="text-[10px] text-gray-400 font-semibold">{item.date}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                      {item.badge}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Typography, Buttons, Event Card & Statistics */}
          <div className="order-1 lg:order-2 lg:col-span-6 xl:col-span-7 pt-2 lg:pt-0 space-y-4 md:space-y-4.5 flex flex-col justify-center text-left">
            
            {/* 1. Title / Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-[clamp(2.2rem,8vw,3.4rem)] lg:text-[clamp(2.3rem,4.2vw,3.8rem)] font-normal leading-[1.03] tracking-[-0.01em] text-gray-950 font-android"
            >
              Future Through <br />
              <span className="text-gradient-blue">Cutting-Edge</span> <br />
              Technology.
            </motion.h1>

            {/* 2. Subparagraph Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-lg text-slate-600 max-w-xl font-medium leading-relaxed"
            >
              By empowering students with greater control over their data, identity, and assets. Join hands-on bootcamps and collaborative code sprints at our Tech Club.
            </motion.p>

            {/* 3 & 4. Action Buttons (Stacked full-width on mobile, side-by-side on desktop) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col md:flex-row items-stretch md:items-center gap-4 pt-1"
            >
              <button
                onClick={handleScrollToEvents}
                className="w-full md:w-auto min-h-[52px] bg-black text-white hover:bg-neutral-800 active:scale-97 transition-all duration-200 px-6.5 py-3.5 rounded-2xl md:rounded-full text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                Explore Events <ArrowRight className="h-4 w-4" />
              </button>
              
              <a
                href="https://chat.whatsapp.com/techclubkalvium"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto min-h-[52px] bg-white md:bg-transparent border border-gray-200 md:border-transparent text-gray-950 hover:bg-gray-50 md:hover:bg-transparent active:scale-97 transition-all duration-200 px-6.5 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs md:shadow-none"
              >
                Join Club <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            {/* 5. Featured Event Card (Mobile Specific Showcase) */}
            {featuredEvent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="block md:hidden my-4"
              >
                <GlassCard variant="gradient" className="p-5 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-[11px] font-extrabold tracking-wide uppercase">
                      🔥 Featured Event
                    </span>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {featuredEvent.eventDate}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-gray-950 font-display tracking-tight">
                    {featuredEvent.title}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 my-3 text-xs text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>{featuredEvent.seatsRemaining} Seats Left</span>
                    </div>
                    {featuredEvent.prizePool && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 font-bold">🏆</span>
                        <span className="font-bold text-gray-900">Prize {featuredEvent.prizePool}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onRegisterClick ? onRegisterClick(featuredEvent.title) : onJoinClick()}
                    className="w-full min-h-[48px] mt-2 bg-blue-600 text-white font-bold rounded-2xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    Register Now <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </GlassCard>
              </motion.div>
            )}

            {/* 6. Minimised Floating Statistics Card embedded on the Right */}
            <div className="pt-2 md:pt-4">
              <StatisticsSection compact={true} className="p-0" />
            </div>

          </div>
          
        </div>
      </div>
    </section>
  );
}
