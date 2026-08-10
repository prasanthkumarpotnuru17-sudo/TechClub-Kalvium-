"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, Plus, Mail, Phone, Globe, ExternalLink, Trash2, Edit2, ShieldCheck } from "lucide-react";
import { TeamMemberItem } from "@/lib/services/mockData";
import { teamService } from "@/services/teamService";
import { motion } from "framer-motion";
import { CrewProfileModal } from "@/components/modals/CrewProfileModal";

interface TeamViewProps {
  onOpenAddModal: () => void;
  onOpenEditModal?: (member: TeamMemberItem) => void;
}

export function TeamView({ onOpenAddModal, onOpenEditModal }: TeamViewProps) {
  const [teamList, setTeamList] = useState<TeamMemberItem[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMemberItem | null>(null);

  useEffect(() => {
    const unsub = teamService.subscribeTeam((data) => {
      setTeamList(data);
    });
    return () => unsub();
  }, []);

  const groups: ("Faculty Coordinators" | "Core Team" | "Student Leads" | "Volunteers")[] = [
    "Faculty Coordinators",
    "Core Team",
    "Student Leads",
    "Volunteers",
  ];

  const handleDelete = async (id: string) => {
    if (confirm("Remove member from club leadership roster?")) {
      await teamService.deleteTeamMember(id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-500" />
            Club Leadership & Team Management
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Faculty leads, student executives, domain leads, and event volunteers.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Role Group Sections */}
      {groups.map((groupName) => {
        const members = teamList.filter((m) => m.roleGroup === groupName);
        if (members.length === 0) return null;

        return (
          <div key={groupName} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200/60 dark:border-gray-800 pb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                {groupName} ({members.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedMember(m)}
                  className="glass-card rounded-2xl p-5 border border-gray-200/60 dark:border-gray-800/60 flex flex-col justify-between space-y-4 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20 shrink-0"
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.avatarBg || "from-indigo-600 to-purple-600"} flex items-center justify-center text-white font-black text-base shrink-0 shadow-md`}>
                        {m.avatarInitials || m.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-gray-900 dark:text-white text-base truncate">{m.name}</h4>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                        {m.designation}
                      </p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">{m.department}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{m.phone}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {m.github && (
                        <a href={m.github} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-900 dark:hover:text-white" title="GitHub">
                          <Globe className="w-4 h-4" />
                        </a>
                      )}
                      {m.linkedin && (
                        <a href={m.linkedin} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600" title="LinkedIn">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {onOpenEditModal && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenEditModal(m);
                          }}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                          title="Edit Crew Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(m.id);
                        }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        title="Remove Member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      <CrewProfileModal
        member={selectedMember ? {
          id: selectedMember.id,
          name: selectedMember.name,
          role: selectedMember.designation || selectedMember.roleGroup,
          roleGroup: selectedMember.roleGroup,
          avatarInitials: selectedMember.avatarInitials || selectedMember.name.slice(0, 2).toUpperCase(),
          avatarBg: selectedMember.avatarBg,
          avatar: selectedMember.avatar,
          bio: selectedMember.bio || "Active Tech Club leader driving student projects.",
          email: selectedMember.email,
          phone: selectedMember.phone,
          github: selectedMember.github,
          linkedin: selectedMember.linkedin || "https://linkedin.com",
          department: selectedMember.department
        } : null}
        onClose={() => setSelectedMember(null)}
      />
    </div>
  );
}
