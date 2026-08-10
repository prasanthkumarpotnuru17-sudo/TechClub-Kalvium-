"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ExternalLink, Phone } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { Card, CardContent } from "@/components/ui/card";
import { teamService } from "@/services/teamService";
import { CrewProfileModal } from "@/components/modals/CrewProfileModal";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  category: "faculty" | "core" | "lead" | "volunteer";
  avatarInitials: string;
  avatarBg: string;
  avatar?: string;
  bio: string;
  linkedin: string;
  github?: string;
  email: string;
  phone?: string;
}

export function Team() {
  const [activeTab, setActiveTab] = useState<"all" | "faculty" | "core" | "lead" | "volunteer">("all");
  const [showAllMobile, setShowAllMobile] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  useEffect(() => {
    const unsub = teamService.subscribeTeam((data) => {
      setTeamMembers(data);
    });
    return () => unsub();
  }, []);

  const filteredMembers = activeTab === "all"
    ? teamMembers
    : teamMembers.filter((m) => m.category === activeTab);

  const tabs: { label: string; value: typeof activeTab }[] = [
    { label: "All Team", value: "all" },
    { label: "Faculty Advisors", value: "faculty" },
    { label: "Core Board", value: "core" },
    { label: "Domain Leads", value: "lead" },
    { label: "Volunteers", value: "volunteer" },
  ];

  return (
    <section id="team" className="relative py-24 bg-slate-50/50">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        
        {/* Section Heading */}
        <div className="max-w-3xl mx-auto text-center mb-12 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Our Crew
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
            Meet the Builders & Mentors
          </h2>
          <p className="text-sm md:text-base text-gray-500">
            The dedicated team orchestrating labs, sponsoring code bootcamps, and assisting student developers.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? "bg-gray-900 border-gray-900 text-white shadow-md shadow-gray-900/10"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Team Grid with Animation */}
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {(showAllMobile ? filteredMembers : filteredMembers).map((member, idx) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                key={member.id}
                className={`h-full ${!showAllMobile && idx >= 4 ? "hidden md:block" : "block"}`}
              >
                <Card 
                  onClick={() => setSelectedMember(member)}
                  className="h-full rounded-[28px] border border-gray-200/50 flex flex-col justify-between overflow-hidden relative group hover:border-blue-500/40 transition-all duration-300 hover:shadow-xl cursor-pointer"
                >
                  <CardContent className="p-6 space-y-6 flex flex-col justify-between h-full">
                    
                    <div className="space-y-4">
                      {/* Avatar Initials / Photo Block */}
                      <div className="flex items-center gap-3">
                        {member.avatar ? (
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="h-14 w-14 rounded-2xl object-cover ring-2 ring-blue-500/20 shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0"
                          />
                        ) : (
                          <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${member.avatarBg} flex items-center justify-center text-white text-lg font-black tracking-tight shadow-md group-hover:scale-105 transition-transform duration-300 shrink-0`}>
                            {member.avatarInitials}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-gray-950 text-base leading-tight group-hover:text-blue-600 transition-colors duration-200">
                            {member.name}
                          </h4>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                            {member.role}
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      <p className="text-xs text-gray-500 leading-relaxed font-medium line-clamp-3">
                        {member.bio}
                      </p>
                    </div>

                    {/* Social links */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="pt-4 border-t border-gray-100 flex items-center gap-3 text-gray-400 group-hover:text-gray-600 transition-colors duration-300"
                    >
                      <a
                        href={member.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-600 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`${member.name} LinkedIn Profile`}
                      >
                        <FaLinkedin className="h-4.5 w-4.5" />
                      </a>
                      {member.github && (
                        <a
                          href={member.github}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-black transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label={`${member.name} GitHub Profile`}
                        >
                          <FaGithub className="h-4.5 w-4.5" />
                        </a>
                      )}
                      <a
                        href={`mailto:${member.email}`}
                        className="hover:text-indigo-600 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label={`Email ${member.name}`}
                      >
                        <Mail className="h-4.5 w-4.5" />
                      </a>
                      {member.phone && (
                        <a
                          href={`tel:${member.phone}`}
                          className="hover:text-emerald-600 transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label={`Call ${member.name}`}
                          title={member.phone}
                        >
                          <Phone className="h-4.5 w-4.5" />
                        </a>
                      )}
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Mobile View All Team Button */}
        {filteredMembers.length > 4 && (
          <div className="mt-8 text-center md:hidden">
            <button
              onClick={() => setShowAllMobile(!showAllMobile)}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-white border border-gray-300 text-gray-900 text-sm font-bold shadow-xs active:scale-97 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {showAllMobile ? "Show Less" : `View All Team (${filteredMembers.length})`}
            </button>
          </div>
        )}

      </div>

      {/* Crew Profile Detail Modal */}
      <CrewProfileModal
        member={selectedMember}
        onClose={() => setSelectedMember(null)}
      />
    </section>
  );
}
