"use client";

import { motion } from "framer-motion";
import { FaWhatsapp, FaBell } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function WhatsAppCTA() {
  return (
    <section id="whatsapp-updates" className="relative py-20 bg-slate-50/30 overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full bg-emerald-500/[0.05] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.015] grid-pattern pointer-events-none" />
      </div>

      <div className="container mx-auto max-w-5xl px-4 md:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", duration: 0.6 }}
        >
          <Card className="rounded-[36px] bg-white border border-emerald-500/10 p-8 md:p-12 shadow-xl shadow-emerald-500/[0.02] relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-300">
            {/* WhatsApp glow element behind content */}
            <div className="absolute right-0 bottom-0 w-64 h-64 rounded-full bg-emerald-100/20 blur-3xl -z-10 group-hover:bg-emerald-100/35 transition-all duration-500" />

            <CardContent className="p-0 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
              
              {/* Left Side: Info */}
              <div className="space-y-6 lg:max-w-xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full">
                  <FaBell className="h-3.5 w-3.5 text-emerald-600 animate-bounce" />
                  <span className="text-xs font-bold text-emerald-700 tracking-wide uppercase">
                    Daily Dev Updates
                  </span>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 leading-tight">
                    Stay Connected With Our <br className="hidden md:inline" />
                    <span className="text-gradient bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">WhatsApp Developer Circle</span>
                  </h2>
                  <p className="text-sm md:text-base text-gray-500 leading-relaxed font-medium">
                    Join our active WhatsApp group for daily alerts. Get instant notifications about upcoming code sprints, hackathon seat openings, study cohorts, internships, and campus speaking schedules.
                  </p>
                </div>
              </div>

              {/* Right Side: Button & Interactive stats */}
              <div className="flex flex-col items-center gap-4 shrink-0 w-full lg:w-auto">
                <a
                  href="https://chat.whatsapp.com/mock-group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full lg:w-auto"
                >
                  <Button
                    variant="primary"
                    className="w-full lg:w-auto min-h-[52px] px-8 py-3.5 rounded-2xl text-base font-bold bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-450 hover:to-green-550 text-white shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 active:scale-97 transition-all duration-200 cursor-pointer"
                  >
                    <FaWhatsapp className="h-6 w-6" />
                    Join WhatsApp Group
                  </Button>
                </a>
                <p className="text-xs font-semibold text-gray-400">
                  ⚡ 800+ members already joined this week
                </p>
              </div>

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
