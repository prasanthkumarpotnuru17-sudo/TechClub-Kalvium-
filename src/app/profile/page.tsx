"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { 
  Camera, Edit3, Mail, GraduationCap, Calendar as CalendarIcon, 
  CheckCircle2, AlertCircle, User as UserIcon, Link2, 
  Star, Heart, Shield, ArrowRight, Clock, Zap, Award, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProfileOverviewPage() {
  const { user, completionItems, updateAvatar } = useAuth();
  const { profile, profileCompletion } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  const isStudent = user?.participantType === "Student" || !user?.participantType;

  const fullName = profile?.personal?.name || user?.name || "Member";
  const email = user?.email || "";
  
  // Education fields (for Students)
  const college = profile?.education?.college || "";
  const course = profile?.education?.course || "";
  const academicYear = profile?.education?.academicYear || "";

  // Professional fields (for Professionals / Mentors / Alumni / Volunteers)
  const company = profile?.professional?.company || "";
  const jobTitle = profile?.professional?.jobTitle || "";

  const city = profile?.personal?.city || "";
  const github = profile?.socials?.github || "";
  const linkedin = profile?.socials?.linkedin || "";
  const skillsList = profile?.professional?.skills ? profile.professional.skills.split(",").map(s => s.trim()) : [];
  const interestsList = profile?.interests?.interestedTeam ? profile.interests.interestedTeam.split(",").map(i => i.trim()) : [];

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("Image size should be less than 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      await updateAvatar(base64Data);
    };
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. Top Hero Profile Summary Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          
          {/* Avatar with Camera Overlay Button */}
          <div className="relative shrink-0">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover shadow-md border-2 border-white"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow-md">
                {userInitials}
              </div>
            )}
            <button
              onClick={handleCameraClick}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-slate-900 text-white border-2 border-white hover:bg-blue-600 transition-colors shadow-sm cursor-pointer"
              title="Upload Profile Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* User Meta Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-950 tracking-tight">{fullName}</h1>
              <span className="px-3 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                {user.participantType || "Member"}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{email}</span>
              </div>
              
              {/* Role Specific Subtitle */}
              {isStudent ? (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{college || "College / University Not Specified"}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company ? `${company}${jobTitle ? ` • ${jobTitle}` : ""}` : "Organization Not Specified"}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Member since July 2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Profile Button */}
        <Link href="/profile/edit" className="shrink-0">
          <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-gray-300 font-semibold text-xs rounded-xl px-4 min-h-[38px] flex items-center gap-2 cursor-pointer shadow-xs">
            <Edit3 className="w-3.5 h-3.5" /> Edit Profile
          </Button>
        </Link>
      </div>

      {/* 2. Profile Completion Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-slate-950">Profile Completion</h3>
            <p className="text-xs text-slate-500 font-medium">Complete your profile to unlock all features</p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="text-2xl font-extrabold text-blue-600 font-mono">{profileCompletion}%</span>
            <Link href="/profile/edit">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5 min-h-[40px] flex items-center gap-1.5 cursor-pointer shadow-xs">
                <span>Complete Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${profileCompletion}%` }} />
        </div>

        {/* Dynamic Verification Status Pills */}
        <div className="flex items-center gap-2.5 flex-wrap pt-1">
          {completionItems && completionItems.length > 0 && (
            completionItems.map((item) => (
              <span
                key={item.key}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                  item.completed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border-rose-200 text-rose-700"
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {item.label}
              </span>
            ))
          )}
        </div>
      </div>

      {/* 3. Profile Information (3x2 Grid Cards) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-950">Profile Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Personal Information */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950">Personal Information</h4>
                </div>
                <Link href="/profile/edit?section=personal" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Full Name</div>
                  <div className="font-bold text-slate-950">{fullName}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Location</div>
                  <div className="font-bold text-slate-950">{city || "Not Specified"}</div>
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Phone Number</div>
                  <div className="font-bold text-slate-950">{profile?.personal?.phone || "Not Specified"}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Role-Specific Details (Education for Students vs Professional for Non-Students) */}
          {isStudent ? (
            /* Education Card for Students */
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-950">Education</h4>
                  </div>
                  <Link href="/profile/edit?section=education" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">University / College</div>
                    <div className="font-bold text-slate-950">{college || "Not Specified"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Course / Degree</div>
                    <div className="font-bold text-slate-950">{course || "Not Specified"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Academic Year</div>
                    <div className="font-bold text-slate-950">{academicYear || "Not Specified"}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Professional Experience Card for Working Professionals / Mentors */
            <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-950">Professional Details</h4>
                  </div>
                  <Link href="/profile/edit?section=professional" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit
                  </Link>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Company / Organization</div>
                    <div className="font-bold text-slate-950">{company || "Not Specified"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Job Title / Designation</div>
                    <div className="font-bold text-slate-950">{jobTitle || "Not Specified"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Social Links */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950">Social Links</h4>
                </div>
                <Link href="/profile/edit?section=socials" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 truncate">{github || "GitHub Not Linked"}</span>
                  {github ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700 truncate">{linkedin || "LinkedIn Not Linked"}</span>
                  {linkedin ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Skills */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                    <Star className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950">Skills</h4>
                </div>
                <Link href="/profile/edit?section=skills" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {skillsList.length > 0 ? (
                  skillsList.map((s) => (
                    <span key={s} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No skills added yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 5: Interests */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                    <Heart className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950">Interests</h4>
                </div>
                <Link href="/profile/edit?section=interests" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {interestsList.length > 0 ? (
                  interestsList.map((i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
                      {i}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No interests added yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Card 6: Account Security */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-950">Account Security</h4>
                </div>
                <Link href="/profile/settings" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> Edit
                </Link>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-medium text-slate-400">Password</div>
                    <div className="font-bold text-slate-950">••••••••</div>
                  </div>
                  <Link href="/profile/settings">
                    <Button className="bg-white hover:bg-slate-50 text-slate-700 border border-gray-200 text-xs font-semibold rounded-lg px-3 py-1 min-h-[32px] cursor-pointer">
                      Change
                    </Button>
                  </Link>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-slate-400">Two-Factor Authentication</div>
                  <div className="font-bold text-emerald-600">Enabled</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Bottom Grid: Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left: Quick Actions */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" /> Quick Actions
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href="/#events" className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 w-fit mb-3">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 group-hover:text-blue-600">Browse Events</h4>
                <p className="text-[11px] text-slate-500 font-medium">Explore upcoming events</p>
              </div>
            </Link>

            <Link href="/profile/events" className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit mb-3">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 group-hover:text-indigo-600">My Registrations</h4>
                <p className="text-[11px] text-slate-500 font-medium">View all event registrations</p>
              </div>
            </Link>

            <Link href="/profile/certificates" className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 w-fit mb-3">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-950 group-hover:text-purple-600">My Certificates</h4>
                <p className="text-[11px] text-slate-500 font-medium">View & download certificates</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Right: Recent Activity */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Recent Activity
          </h2>

          <div className="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-slate-100 text-slate-600">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-950">Registered for HackQuest 2026</h4>
                  <p className="text-[11px] text-slate-500 font-medium">July 20, 2026 • 10:30 AM</p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold shrink-0">
                Upcoming
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
