"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown, Activity } from "lucide-react";
import { FaGithub, FaLinkedin, FaInstagram, FaDiscord } from "react-icons/fa";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const toggleAccordion = (title: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const columns = [
    {
      title: "Quick Links",
      links: [
        { label: "Home", href: "#home" },
        { label: "Upcoming Events", href: "#events" },
        { label: "Announcements", href: "#announcements" },
        { label: "Core Board", href: "#team" },
        { label: "FAQ Desk", href: "#faq" },
      ],
    },
    {
      title: "Events & Labs",
      links: [
        { label: "HackQuest 2026", href: "#events" },
        { label: "AI & ML Summit", href: "#events" },
        { label: "Cloud Infra Sprint", href: "#events" },
        { label: "IoT Hardware Lab", href: "#events" },
        { label: "Sponsorship Deck", href: "#contact" },
      ],
    },
    {
      title: "Developer Resources",
      links: [
        { label: "Club GitHub Repos", href: "https://github.com", external: true },
        { label: "Developer Guidelines", href: "#contact" },
        { label: "Code of Conduct", href: "#contact" },
      ],
    },
    {
      title: "Community Channels",
      links: [
        { label: "Discord Server", href: "https://discord.com", external: true },
        { label: "WhatsApp Updates Group", href: "#whatsapp-updates" },
        { label: "Student Forums", href: "#contact" },
        { label: "Campus Incubator", href: "#contact" },
      ],
    },
  ];

  return (
    <footer className="relative bg-[#070A12] text-gray-400 pt-16 md:pt-20 pb-10 overflow-hidden border-t border-slate-800/80">
      
      {/* Subtle Ambient Radial Glow Accents */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] rounded-full bg-blue-600/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full bg-indigo-600/[0.03] blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] grid-pattern pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 md:px-6 relative z-10">
        
        {/* Top Portion: Brand Info and 4-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-12 pb-12 md:pb-16 border-b border-slate-800/80">
          
          {/* Left Brand Column (4 Columns on Desktop) */}
          <div className="lg:col-span-4 space-y-6 text-center md:text-left flex flex-col items-center md:items-start">
            <Link href="/" onClick={handleLogoClick} className="flex flex-col items-center md:items-start leading-none w-fit group select-none">
              <span className="font-display font-bold tracking-tight text-white text-3xl md:text-4xl transition-colors duration-250 group-hover:text-blue-500">
                Tech Club
              </span>
              <span className="text-xs font-semibold text-red-500 self-end -mt-0.5 tracking-normal">
                Kalvium
              </span>
            </Link>
            
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-medium max-w-sm">
              Tech Club by Kalvium is the premier student incubator for software developers, hardware builders, product designers, and technical writers on campus. We focus on cohort-based builds, peer learning, and real-world project deployments.
            </p>

            {/* Platform Status Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold select-none">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>All Systems Operational • Devnet v2.4</span>
            </div>

            {/* Social Network Icon Buttons */}
            <div className="flex gap-3 pt-2 justify-center md:justify-start">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs"
                aria-label="Tech Club GitHub"
              >
                <FaGithub className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs"
                aria-label="Tech Club LinkedIn"
              >
                <FaLinkedin className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs"
                aria-label="Tech Club Instagram"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-800 text-gray-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all duration-200 flex items-center justify-center shadow-xs"
                aria-label="Tech Club Discord"
              >
                <FaDiscord className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Right 4-Column Grid (8 Columns on Desktop: 4 Equal Columns) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8">
            {columns.map((col) => {
              const isOpen = !!openAccordions[col.title];
              return (
                <div key={col.title} className="border-b border-slate-800/60 md:border-none pb-4 md:pb-0">
                  <button
                    onClick={() => toggleAccordion(col.title)}
                    className="w-full flex items-center justify-between md:pointer-events-none text-left py-2 md:py-0 cursor-pointer md:cursor-default"
                  >
                    <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest font-display">
                      {col.title}
                    </h4>
                    <ChevronDown className={`h-4 w-4 text-gray-500 md:hidden transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <ul className={`space-y-2.5 pt-3 md:pt-4 ${isOpen ? "block" : "hidden md:block"}`}>
                    {col.links.map((link) => (
                      <li key={link.label}>
                        <a
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={link.external ? "noreferrer" : undefined}
                          className="text-xs font-medium text-slate-400 hover:text-white transition-colors duration-200 flex items-center gap-1 py-1 min-h-[36px] group/link"
                        >
                          {link.label}
                          {link.external && (
                            <ArrowUpRight className="h-3 w-3 text-slate-500 group-hover/link:text-white transition-colors duration-200" />
                          )}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

        </div>

        {/* Bottom Portion: Copyright and Legal Terms */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium tracking-tight text-center md:text-left">
          <p>
            &copy; {currentYear} Tech Club by Kalvium. Built with Next.js 16, React 19 & Framer Motion. All rights reserved.
          </p>
          <div className="flex gap-4 justify-center items-center">
            <a href="#contact" className="hover:text-slate-300 transition-colors duration-200 cursor-pointer min-h-[44px] flex items-center">
              Privacy Policy
            </a>
            <span className="text-slate-700">•</span>
            <a href="#contact" className="hover:text-slate-300 transition-colors duration-200 cursor-pointer min-h-[44px] flex items-center">
              Terms of Service
            </a>
            <span className="text-slate-700">•</span>
            <a href="#contact" className="hover:text-slate-300 transition-colors duration-200 cursor-pointer min-h-[44px] flex items-center">
              Accessibility
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
