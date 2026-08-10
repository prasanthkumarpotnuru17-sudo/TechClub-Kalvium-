"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { 
  GraduationCap, Briefcase, Award, Users, HeartHandshake, 
  CheckCircle2, ArrowRight 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ParticipantType } from "@/types/auth";

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const { dismissOnboarding } = useAuth();
  const { profile, profileCompletion, updateParticipantType, updateProfileData } = useProfile();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<ParticipantType>("Student");
  
  const [edu, setEdu] = useState({
    college: profile?.education?.college || "",
    course: profile?.education?.course || "B.Tech Computer Science",
    academicYear: profile?.education?.academicYear || "1st Year",
    company: profile?.professional?.company || "",
    jobTitle: profile?.professional?.jobTitle || "",
  });

  const [socials, setSocials] = useState({
    linkedin: profile?.socials?.linkedin || "",
    github: profile?.socials?.github || "",
  });

  const handleClose = () => {
    dismissOnboarding();
    onClose();
  };

  const handleStep1 = (type: ParticipantType) => {
    setSelectedType(type);
    updateParticipantType(type);
    setStep(2);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileData({
      education: { college: edu.college, course: edu.course, academicYear: edu.academicYear },
      professional: { company: edu.company, jobTitle: edu.jobTitle },
    });
    setStep(3);
  };

  const handleStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileData({
      socials,
    });
    handleClose();
  };

  const roles: { type: ParticipantType; label: string; icon: React.ReactNode }[] = [
    { type: "Student", label: "Student", icon: <GraduationCap className="w-5 h-5" /> },
    { type: "Professional", label: "Working Professional", icon: <Briefcase className="w-5 h-5" /> },
    { type: "Mentor", label: "Mentor / Speaker", icon: <Award className="w-5 h-5" /> },
    { type: "Alumni", label: "Alumni", icon: <Users className="w-5 h-5" /> },
    { type: "Volunteer", label: "Volunteer", icon: <HeartHandshake className="w-5 h-5" /> },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Profile Setup (3 Quick Steps)">
      <div className="space-y-5">
        
        {/* High-Contrast Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Step {step} of 3</span>
            <span className="text-blue-600 font-mono font-bold">{profileCompletion}% Complete</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} />
          </div>
        </div>

        {/* STEP 1: Basic Information & Role */}
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Step 1: How do you identify yourself?</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roles.map((r) => (
                <button
                  key={r.type}
                  type="button"
                  onClick={() => handleStep1(r.type)}
                  className="p-4 rounded-2xl border border-gray-200 bg-slate-50 hover:bg-blue-50/70 hover:border-blue-500 text-left transition-all duration-200 cursor-pointer flex items-center gap-3 group shadow-xs active:scale-98"
                >
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    {r.icon}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{r.label}</h5>
                    <span className="text-[10px] font-semibold text-slate-500">Select to continue</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Education / Work */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Step 2: Education & Affiliation</h4>
            {selectedType === "Student" ? (
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="College / University Name *"
                  value={edu.college}
                  onChange={(e) => setEdu({ ...edu, college: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Course / Degree"
                    value={edu.course}
                    onChange={(e) => setEdu({ ...edu, course: e.target.value })}
                    className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                  />
                  <select
                    value={edu.academicYear}
                    onChange={(e) => setEdu({ ...edu, academicYear: e.target.value })}
                    className="min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 cursor-pointer focus:bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Company / Organization *"
                  value={edu.company}
                  onChange={(e) => setEdu({ ...edu, company: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Job Title / Designation"
                  value={edu.jobTitle}
                  onChange={(e) => setEdu({ ...edu, jobTitle: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              Continue to Step 3 <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        )}

        {/* STEP 3: Developer Socials */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Step 3: Developer Socials & Portfolio</h4>
            <div className="space-y-3">
              <input
                type="url"
                placeholder="LinkedIn Profile URL (Optional)"
                value={socials.linkedin}
                onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
              <input
                type="url"
                placeholder="GitHub Profile URL (Optional)"
                value={socials.github}
                onChange={(e) => setSocials({ ...socials, github: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white placeholder:text-slate-400"
              />
            </div>

            <Button
              type="submit"
              className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" /> Complete Onboarding & Save Profile
            </Button>
          </form>
        )}

      </div>
    </Modal>
  );
}
