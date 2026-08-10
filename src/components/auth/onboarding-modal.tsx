"use client";

import React, { useState, useEffect } from "react";
import { 
  X, CheckCircle2, UserCheck, ShieldCheck, GraduationCap, 
  Briefcase, Award, Users, HeartHandshake, ArrowRight, Sparkles, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ParticipantType, UserProfileData, AuthUser } from "@/lib/services/mockData";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  onSaveProfile: (participantType: ParticipantType, profile: UserProfileData) => void;
  eventIntentTitle?: string;
}

export function OnboardingModal({
  isOpen,
  onClose,
  user,
  onSaveProfile,
  eventIntentTitle,
}: OnboardingModalProps) {
  const [participantType, setParticipantType] = useState<ParticipantType>(
    user?.participantType || "Student"
  );

  const [formData, setFormData] = useState<UserProfileData>({
    college: user?.profile?.college || "",
    course: user?.profile?.course || "B.Tech Computer Science & Engineering",
    department: user?.profile?.department || "Computer Science",
    academicYear: user?.profile?.academicYear || "1st Year",
    company: user?.profile?.company || "",
    jobTitle: user?.profile?.jobTitle || "",
    yearsOfExperience: user?.profile?.yearsOfExperience || "1-3 Years",
    skills: user?.profile?.skills || "",
    organization: user?.profile?.organization || "",
    designation: user?.profile?.designation || "",
    expertise: user?.profile?.expertise || "",
    availability: user?.profile?.availability || "Weekends",
    graduationYear: user?.profile?.graduationYear || "2024",
    interestedTeam: user?.profile?.interestedTeam || "Web Development",
    experience: user?.profile?.experience || "",
    city: user?.profile?.city || "",
    domain: user?.profile?.domain || "Artificial Intelligence",
    linkedin: user?.profile?.linkedin || "",
    github: user?.profile?.github || "",
    portfolio: user?.profile?.portfolio || "",
    bio: user?.profile?.bio || "",
  });

  const [fullName, setFullName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(user?.participantType ? 2 : 1);

  // Sync prop changes
  useEffect(() => {
    if (user) {
      setFullName(user.name);
      if (user.participantType) setParticipantType(user.participantType);
      if (user.profile) setFormData((prev) => ({ ...prev, ...user.profile }));
    }
  }, [user]);

  // Calculate live completion percentage
  const calculateCompletion = (): number => {
    let score = 20; // Signup base
    if (participantType) score += 20;

    if (participantType === "Student") {
      if (formData.college) score += 20;
      if (formData.course) score += 15;
      if (formData.academicYear) score += 15;
      if (formData.department) score += 10;
    } else if (participantType === "Professional") {
      if (formData.company) score += 30;
      if (formData.jobTitle) score += 30;
    } else if (participantType === "Mentor") {
      if (formData.organization) score += 30;
      if (formData.expertise) score += 30;
    } else if (participantType === "Alumni") {
      if (formData.graduationYear) score += 30;
      if (formData.company) score += 30;
    } else if (participantType === "Volunteer") {
      if (formData.interestedTeam) score += 30;
      if (formData.skills) score += 30;
    }

    return Math.min(100, score);
  };

  const completionPct = calculateCompletion();

  const handleInputChange = (field: keyof UserProfileData, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onSaveProfile(participantType, formData);
      onClose();
    }, 800);
  };

  const participantOptions: {
    type: ParticipantType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      type: "Student",
      title: "Student",
      description: "Undergraduate / Postgraduate student from any university",
      icon: <GraduationCap className="w-5 h-5" />,
      color: "from-blue-600 to-indigo-600",
    },
    {
      type: "Professional",
      title: "Working Professional",
      description: "Software Engineer, Architect, Designer, or Tech Professional",
      icon: <Briefcase className="w-5 h-5" />,
      color: "from-purple-600 to-indigo-600",
    },
    {
      type: "Mentor",
      title: "Mentor / Speaker",
      description: "Industry expert willing to mentor students or deliver talks",
      icon: <Award className="w-5 h-5" />,
      color: "from-amber-500 to-orange-600",
    },
    {
      type: "Alumni",
      title: "Alumni",
      description: "Graduated tech student connecting back with university cohorts",
      icon: <Users className="w-5 h-5" />,
      color: "from-emerald-500 to-teal-600",
    },
    {
      type: "Volunteer",
      title: "Volunteer",
      description: "Community organizer helping execute hackathons and events",
      icon: <HeartHandshake className="w-5 h-5" />,
      color: "from-rose-500 to-pink-600",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Your Profile">
      <div className="space-y-6">
        
        {/* Intent Banner if triggered by Event Registration */}
        {eventIntentTitle && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <strong>Action Required:</strong> Please complete your profile to finish registration for <strong>{eventIntentTitle}</strong>.
            </div>
          </div>
        )}

        {/* Live Progress Bar Indicator */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-gray-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Profile Completion
            </span>
            <span className="text-blue-400 font-mono text-sm">{completionPct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-[11px] text-gray-400">
            {completionPct === 100
              ? "🎉 Profile complete! All platform features and event passes unlocked."
              : "Complete required fields to unlock event passes, certificates, and team invites."}
          </p>
        </div>

        {/* STEP 1: Participant Type Selector */}
        {step === 1 ? (
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-200">
              How do you identify yourself? *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {participantOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    setParticipantType(opt.type);
                    setStep(2);
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                    participantType === opt.type
                      ? "bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-xl bg-gradient-to-br ${opt.color} text-white shadow-xs`}>
                      {opt.icon}
                    </div>
                    {participantType === opt.type && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{opt.title}</h4>
                    <p className="text-[11px] text-gray-400 mt-1 leading-tight">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* STEP 2: Dynamic Form based on Participant Type */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Header Switcher */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
              <span className="text-gray-300 font-semibold">
                Role: <strong className="text-white">{participantType}</strong>
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-blue-400 hover:underline font-bold cursor-pointer"
              >
                Change Role
              </button>
            </div>

            {/* Dynamic Role Fields */}
            {participantType === "Student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-300">College / University *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stanford University / Kalvium Campus / IIT"
                    value={formData.college}
                    onChange={(e) => handleInputChange("college", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Course / Degree *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Tech CS / B.Sc IT"
                    value={formData.course}
                    onChange={(e) => handleInputChange("course", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Current Academic Year *</label>
                  <select
                    value={formData.academicYear}
                    onChange={(e) => handleInputChange("academicYear", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Department *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI & Machine Learning"
                    value={formData.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Primary Domain / Interest</label>
                  <input
                    type="text"
                    placeholder="e.g. Web3, Cloud, Mobile Apps"
                    value={formData.domain}
                    onChange={(e) => handleInputChange("domain", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {participantType === "Professional" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Company / Organization *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google, Microsoft, Startup"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Job Title / Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Software Engineer"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Years of Experience</label>
                  <select
                    value={formData.yearsOfExperience}
                    onChange={(e) => handleInputChange("yearsOfExperience", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="0-1 Years">0-1 Years</option>
                    <option value="1-3 Years">1-3 Years</option>
                    <option value="3-5 Years">3-5 Years</option>
                    <option value="5+ Years">5+ Years</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Core Skills</label>
                  <input
                    type="text"
                    placeholder="e.g. React, Next.js, Python, AWS"
                    value={formData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {participantType === "Mentor" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Organization / Employer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Meta, AWS, Kalvium"
                    value={formData.organization}
                    onChange={(e) => handleInputChange("organization", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Designation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staff Architect / Tech Lead"
                    value={formData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-300">Areas of Expertise *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Machine Learning, System Design, Career Mentorship"
                    value={formData.expertise}
                    onChange={(e) => handleInputChange("expertise", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {participantType === "Alumni" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Graduation Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024"
                    value={formData.graduationYear}
                    onChange={(e) => handleInputChange("graduationYear", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Current Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Uber / Stripe"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {participantType === "Volunteer" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Interested Team *</label>
                  <select
                    value={formData.interestedTeam}
                    onChange={(e) => handleInputChange("interestedTeam", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Event Operations">Event Operations</option>
                    <option value="Design & Media">Design & Media</option>
                    <option value="Sponsorship & PR">Sponsorship & PR</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Skills / Contributions</label>
                  <input
                    type="text"
                    placeholder="e.g. Event Management, Video Editing"
                    value={formData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Social Links (Optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">LinkedIn Profile (Optional)</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin}
                  onChange={(e) => handleInputChange("linkedin", e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">GitHub Profile (Optional)</label>
                <input
                  type="url"
                  placeholder="https://github.com/username"
                  value={formData.github}
                  onChange={(e) => handleInputChange("github", e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Save & Complete Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full min-h-[52px] bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-base shadow-lg active:scale-97 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? "Saving Profile..." : "Complete Profile & Unlock Features"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
}
