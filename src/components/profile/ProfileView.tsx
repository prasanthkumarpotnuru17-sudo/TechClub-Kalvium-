"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { 
  User as UserIcon, Shield, Award, Calendar, Users, 
  Settings, Bell, Lock, Trash2, CheckCircle2, Sparkles, ArrowRight, Save
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ParticipantType } from "@/types/auth";

interface ProfileViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileView({ isOpen, onClose }: ProfileViewProps) {
  const { user, role, logout } = useAuth();
  const { profile, profileCompletion, updateParticipantType, updateProfileData } = useProfile();

  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "settings">("overview");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states for editing profile
  const [personal, setPersonal] = useState({
    name: profile?.personal?.name || user?.name || "",
    phone: profile?.personal?.phone || "",
    city: profile?.personal?.city || "",
    bio: profile?.personal?.bio || "",
  });

  const [education, setEducation] = useState({
    college: profile?.education?.college || "",
    course: profile?.education?.course || "",
    department: profile?.education?.department || "",
    academicYear: profile?.education?.academicYear || "1st Year",
    graduationYear: profile?.education?.graduationYear || "2026",
  });

  const [professional, setProfessional] = useState({
    company: profile?.professional?.company || "",
    jobTitle: profile?.professional?.jobTitle || "",
    yearsOfExperience: profile?.professional?.yearsOfExperience || "",
    skills: profile?.professional?.skills || "",
  });

  const [socials, setSocials] = useState({
    linkedin: profile?.socials?.linkedin || "",
    github: profile?.socials?.github || "",
    portfolio: profile?.socials?.portfolio || "",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileData({
      personal,
      education,
      professional,
      socials,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!user || !profile) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="My Student Profile & Account">
      <div className="space-y-6">
        
        {/* Profile Card Header */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl font-bold shadow-md shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-lg font-bold text-white">{user.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase">
                  {role}
                </span>
                {user.participantType && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-bold uppercase">
                    {user.participantType}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex flex-col items-end space-y-1">
            <div className="text-xs text-gray-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Completion: <span className="text-blue-400 font-bold">{profileCompletion}%</span>
            </div>
            <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${profileCompletion}%` }} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "overview" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            Overview & Activity
          </button>
          <button
            onClick={() => setActiveTab("edit")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "edit" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            Edit Profile
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === "settings" ? "bg-blue-600 text-white shadow-sm" : "text-gray-400 hover:text-white"
            }`}
          >
            Account Settings
          </button>
        </div>

        {/* TAB 1: Overview & Achievements */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <Award className="w-5 h-5 text-blue-400 mx-auto" />
                <div className="text-lg font-bold text-white">2</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">My Certificates</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <Calendar className="w-5 h-5 text-indigo-400 mx-auto" />
                <div className="text-lg font-bold text-white">3</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Registered Events</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <Users className="w-5 h-5 text-purple-400 mx-auto" />
                <div className="text-lg font-bold text-white">1</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">Active Teams</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-1">
                <Sparkles className="w-5 h-5 text-amber-400 mx-auto" />
                <div className="text-lg font-bold text-white">500</div>
                <div className="text-[10px] text-gray-400 uppercase font-semibold">XP Points</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
              <h4 className="font-bold text-white">Profile Information Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-gray-300">
                <div><strong>College:</strong> {profile.education.college || "Not set"}</div>
                <div><strong>Course:</strong> {profile.education.course || "Not set"}</div>
                <div><strong>Academic Year:</strong> {profile.education.academicYear || "1st Year"}</div>
                <div><strong>City:</strong> {profile.personal.city || "Not set"}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Edit Profile */}
        {activeTab === "edit" && (
          <form onSubmit={handleSave} className="space-y-4">
            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Personal Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={personal.name}
                  onChange={(e) => setPersonal({ ...personal, name: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
                <input
                  type="text"
                  placeholder="City"
                  value={personal.city}
                  onChange={(e) => setPersonal({ ...personal, city: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
              </div>

              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider pt-2">Education & College</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="College / University Name"
                  value={education.college}
                  onChange={(e) => setEducation({ ...education, college: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700 sm:col-span-2"
                />
                <input
                  type="text"
                  placeholder="Course / Degree"
                  value={education.course}
                  onChange={(e) => setEducation({ ...education, course: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
                <input
                  type="text"
                  placeholder="Academic Year (e.g. 1st Year)"
                  value={education.academicYear}
                  onChange={(e) => setEducation({ ...education, academicYear: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
              </div>

              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider pt-2">Social Profiles</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="url"
                  placeholder="LinkedIn URL"
                  value={socials.linkedin}
                  onChange={(e) => setSocials({ ...socials, linkedin: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
                <input
                  type="url"
                  placeholder="GitHub URL"
                  value={socials.github}
                  onChange={(e) => setSocials({ ...socials, github: e.target.value })}
                  className="min-h-[44px] px-3.5 rounded-xl bg-slate-900 text-sm text-white border border-slate-700"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-[48px] bg-blue-600 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Profile Changes
            </Button>
          </form>
        )}

        {/* TAB 3: Account Settings */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" /> Password & Security
              </h4>
              <p className="text-xs text-gray-400">Change your password or manage multi-factor authentication.</p>
              <Button variant="secondary" className="text-xs rounded-xl min-h-[38px] bg-slate-800 text-white">
                Change Password
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" /> Notifications & Broadcasts
              </h4>
              <p className="text-xs text-gray-400">Receive email alerts for event passes, hackathons, and certificate releases.</p>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <Button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-xs min-h-[40px]"
              >
                Log Out
              </Button>
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
}
