"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FolderGit, Users, Monitor, Trophy } from "lucide-react";

// Count-up helper component with smooth animation
function Counter({ target, suffix = "+" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1800; // 1.8 seconds
    const end = target || 0;
    if (end === 0) {
      setCount(0);
      return;
    }
    const increment = Math.max(1, Math.ceil(end / (duration / 16))); // ~60fps
    
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

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

import { statsService } from "@/services/statsService";

export interface StatItem {
  id: string;
  icon: React.ElementType;
  numericTarget: number;
  suffix: string;
  label: string;
  fullLabel?: string;
  accentColor: string;
  iconBgClass: string;
  underlineBgClass: string;
}

interface StatisticsProps {
  stats?: {
    projectsCompleted?: number;
    members?: number;
    workshops?: number;
    hackathonsWon?: number;
  };
  compact?: boolean;
  className?: string;
}

export function StatisticsSection({ stats: propStats, compact = true, className = "" }: StatisticsProps) {
  const [liveStats, setLiveStats] = useState<{
    projectsCompleted: number;
    members: number;
    workshops: number;
    hackathonsWon: number;
  }>({
    projectsCompleted: propStats?.projectsCompleted ?? 25,
    members: propStats?.members ?? 150,
    workshops: propStats?.workshops ?? 20,
    hackathonsWon: propStats?.hackathonsWon ?? 8,
  });

  useEffect(() => {
    statsService.getHeroStats().then((data) => {
      setLiveStats({
        projectsCompleted: propStats?.projectsCompleted ?? (data.projectsCompleted || 25),
        members: propStats?.members ?? (data.members || 150),
        workshops: propStats?.workshops ?? (data.workshops || 20),
        hackathonsWon: propStats?.hackathonsWon ?? (data.hackathonsWon || 8),
      });
    }).catch(err => {
      console.warn("Real-time stats fetch notice:", err);
    });
  }, [propStats]);

  const statItems: StatItem[] = [
    {
      id: "stat-projects",
      icon: FolderGit,
      numericTarget: liveStats.projectsCompleted,
      suffix: "+",
      label: "PROJECTS",
      fullLabel: "PROJECTS COMPLETED",
      accentColor: "#7C3AED",
      iconBgClass: "bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20 shadow-xs",
      underlineBgClass: "bg-[#7C3AED]",
    },
    {
      id: "stat-members",
      icon: Users,
      numericTarget: liveStats.members,
      suffix: "+",
      label: "MEMBERS",
      fullLabel: "ACTIVE MEMBERS",
      accentColor: "#F59E0B",
      iconBgClass: "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 shadow-xs",
      underlineBgClass: "bg-[#F59E0B]",
    },
    {
      id: "stat-workshops",
      icon: Monitor,
      numericTarget: liveStats.workshops,
      suffix: "+",
      label: "WORKSHOPS",
      fullLabel: "WORKSHOPS",
      accentColor: "#2563EB",
      iconBgClass: "bg-[#2563EB]/10 text-[#2563EB] border border-[#2563EB]/20 shadow-xs",
      underlineBgClass: "bg-[#2563EB]",
    },
    {
      id: "stat-hackathons",
      icon: Trophy,
      numericTarget: liveStats.hackathonsWon,
      suffix: "+",
      label: "HACKATHONS",
      fullLabel: "HACKATHONS WON",
      accentColor: "#22C55E",
      iconBgClass: "bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 shadow-xs",
      underlineBgClass: "bg-[#22C55E]",
    },
  ];

  return (
    <div className={`w-full ${className}`}>
      {/* Floating White Statistics Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -3 }}
        className={`w-full bg-white border border-black/[0.06] shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.09)] transition-all duration-300 ease-out backdrop-blur-md ${
          compact
            ? "rounded-[22px] p-2.5 sm:p-3 md:p-3.5"
            : "max-w-[1200px] mx-auto min-h-[220px] rounded-[32px] p-6 sm:p-8"
        }`}
      >
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100/90">
          {statItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className={`group flex flex-col items-center justify-center text-center transition-all duration-300 cursor-default select-none ${
                  compact ? "px-1.5 py-1.5 sm:px-2 sm:py-2" : "px-4 py-6"
                }`}
              >
                {/* TOP: Rounded square icon container */}
                <div
                  className={`flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.08] backdrop-blur-xs ${
                    item.iconBgClass
                  } ${
                    compact
                      ? "w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[14px]"
                      : "w-[72px] h-[72px] rounded-[20px]"
                  }`}
                >
                  <IconComponent className={compact ? "w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" : "w-8 h-8 stroke-[2.2]"} />
                </div>

                {/* MIDDLE: Large bold number */}
                <h3
                  className={`font-extrabold text-[#0F172A] leading-none tracking-tight font-display ${
                    compact
                      ? "text-xl sm:text-2xl lg:text-[28px] my-1.5"
                      : "text-[44px] sm:text-[50px] lg:text-[56px] my-3"
                  }`}
                >
                  <Counter target={item.numericTarget} suffix={item.suffix} />
                </h3>

                {/* BOTTOM: Uppercase label */}
                <p
                  className={`font-semibold uppercase tracking-[0.5px] text-[#64748B] ${
                    compact
                      ? "text-[9px] sm:text-[10px] md:text-[11px] mb-1.5"
                      : "text-xs sm:text-sm tracking-[1px] mb-3.5"
                  }`}
                >
                  {compact ? item.label : item.fullLabel}
                </p>

                {/* ACCENT: Small coloured underline with rounded ends */}
                <div
                  className={`rounded-full ${item.underlineBgClass} transition-all duration-300 group-hover:w-8 ${
                    compact ? "w-6 h-0.5" : "w-10 h-1"
                  }`}
                  aria-hidden="true"
                />
              </motion.article>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
