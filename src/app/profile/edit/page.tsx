"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { 
  FileText, GraduationCap, Briefcase, Link2, CheckCircle2, 
  Save, ArrowLeft, Loader2, Star, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";

function ProfileEditContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetSection = searchParams.get("section");

  const { user } = useAuth();
  const { profile, updateProfileData } = useProfile();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const isStudent = user?.participantType === "Student" || !user?.participantType;

  // Section Refs for smooth auto-scroll
  const personalRef = useRef<HTMLDivElement>(null);
  const educationRef = useRef<HTMLDivElement>(null);
  const professionalRef = useRef<HTMLDivElement>(null);
  const socialsRef = useRef<HTMLDivElement>(null);
  const skillsRef = useRef<HTMLDivElement>(null);
  const interestsRef = useRef<HTMLDivElement>(null);

  // Synchronized state with profile data (NO hardcoded string fallbacks)
  const [personal, setPersonal] = useState({
    name: "",
    phone: "",
    city: "",
    bio: "",
  });

  const [education, setEducation] = useState({
    college: "",
    course: "",
    department: "",
    academicYear: "1st Year",
  });

  const [professional, setProfessional] = useState({
    company: "",
    jobTitle: "",
    skills: "",
  });

  const [socials, setSocials] = useState({
    linkedin: "",
    github: "",
    portfolio: "",
  });

  const [interests, setInterests] = useState({
    interestedTeam: "",
  });

  // Populate input fields with existing values immediately
  useEffect(() => {
    if (profile || user) {
      setPersonal({
        name: profile?.personal?.name || user?.name || "",
        phone: profile?.personal?.phone || "",
        city: profile?.personal?.city || "",
        bio: profile?.personal?.bio || "",
      });

      setEducation({
        college: profile?.education?.college || "",
        course: profile?.education?.course || "",
        department: profile?.education?.department || "",
        academicYear: profile?.education?.academicYear || "1st Year",
      });

      setProfessional({
        company: profile?.professional?.company || "",
        jobTitle: profile?.professional?.jobTitle || "",
        skills: profile?.professional?.skills || "",
      });

      setSocials({
        linkedin: profile?.socials?.linkedin || "",
        github: profile?.socials?.github || "",
        portfolio: profile?.socials?.portfolio || "",
      });

      setInterests({
        interestedTeam: profile?.interests?.interestedTeam || "",
      });
    }
  }, [profile, user]);

  // Smooth scroll to targeted section query param
  useEffect(() => {
    if (!targetSection) return;
    setTimeout(() => {
      if (targetSection === "personal" && personalRef.current) personalRef.current.scrollIntoView({ behavior: "smooth" });
      if (targetSection === "education" && educationRef.current) educationRef.current.scrollIntoView({ behavior: "smooth" });
      if (targetSection === "professional" && professionalRef.current) professionalRef.current.scrollIntoView({ behavior: "smooth" });
      if (targetSection === "socials" && socialsRef.current) socialsRef.current.scrollIntoView({ behavior: "smooth" });
      if (targetSection === "skills" && skillsRef.current) skillsRef.current.scrollIntoView({ behavior: "smooth" });
      if (targetSection === "interests" && interestsRef.current) interestsRef.current.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, [targetSection]);

  const handleFieldChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateProfileData({
        personal,
        education,
        professional: {
          ...professional,
          skills: professional.skills,
        },
        socials,
        interests,
      });

      setSaving(false);
      setSaveSuccess(true);
      setIsDirty(false);

      // Automatically return to Profile Overview after 800ms
      setTimeout(() => {
        router.push("/profile");
      }, 800);
    } catch (err) {
      setSaving(false);
      alert("Error saving profile. Please try again.");
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      if (confirm("You have unsaved changes. Leave without saving?")) {
        router.push("/profile");
      }
    } else {
      router.push("/profile");
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={handleCancel}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Overview
          </button>
          <h1 className="text-2xl font-bold text-slate-950">Edit Profile Information</h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleCancel}
            className="min-h-[40px] bg-white hover:bg-slate-100 text-slate-700 border border-gray-300 font-semibold text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            form="edit-profile-form"
            type="submit"
            disabled={saving}
            className="min-h-[40px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-5 flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>✓ Profile Updated Successfully! Redirecting to overview...</span>
        </div>
      )}

      <form id="edit-profile-form" onSubmit={handleSave} className="space-y-6">
        
        {/* Section 1: Personal Information */}
        <div ref={personalRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Personal Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Name *</label>
              <input
                type="text"
                required
                value={personal.name}
                onChange={(e) => { setPersonal({ ...personal, name: e.target.value }); handleFieldChange(); }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Phone Number</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={personal.phone}
                onChange={(e) => { setPersonal({ ...personal, phone: e.target.value }); handleFieldChange(); }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Location / City</label>
              <input
                type="text"
                placeholder="e.g. Chennai, Tamil Nadu, India"
                value={personal.city}
                onChange={(e) => { setPersonal({ ...personal, city: e.target.value }); handleFieldChange(); }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Developer Bio</label>
              <textarea
                rows={3}
                placeholder="Write a short summary of your background..."
                value={personal.bio}
                onChange={(e) => { setPersonal({ ...personal, bio: e.target.value }); handleFieldChange(); }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Role-Specific Details (Education for Students vs Professional for Non-Students) */}
        {isStudent ? (
          /* Education Section for Students ONLY */
          <div ref={educationRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" /> Education & University
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700">University / College Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMET University, Chennai"
                  value={education.college}
                  onChange={(e) => { setEducation({ ...education, college: e.target.value }); handleFieldChange(); }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Course / Degree</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Computer Science"
                  value={education.course}
                  onChange={(e) => { setEducation({ ...education, course: e.target.value }); handleFieldChange(); }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Academic Year</label>
                <select
                  value={education.academicYear}
                  onChange={(e) => { setEducation({ ...education, academicYear: e.target.value }); handleFieldChange(); }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Graduated">Graduated</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* Professional Section for Working Professionals / Mentors / Alumni / Volunteers */
          <div ref={professionalRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-purple-600" /> Professional Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Company / Organization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Google, Vercel, Startup"
                  value={professional.company}
                  onChange={(e) => { setProfessional({ ...professional, company: e.target.value }); handleFieldChange(); }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Job Title / Designation</label>
                <input
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={professional.jobTitle}
                  onChange={(e) => { setProfessional({ ...professional, jobTitle: e.target.value }); handleFieldChange(); }}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Social Links */}
        <div ref={socialsRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" /> Developer Social Links
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">GitHub Profile</label>
              <input
                type="text"
                placeholder="github.com/username"
                value={socials.github}
                onChange={(e) => { setSocials({ ...socials, github: e.target.value }); handleFieldChange(); }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">LinkedIn Profile</label>
              <input
                type="text"
                placeholder="linkedin.com/in/username"
                value={socials.linkedin}
                onChange={(e) => { setSocials({ ...socials, linkedin: e.target.value }); handleFieldChange(); }}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Skills & Interests */}
        <div ref={skillsRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-600" /> Skills & Technical Expertise
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Core Technical Skills (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. React, Next.js, Python, TypeScript, AWS"
              value={professional.skills}
              onChange={(e) => { setProfessional({ ...professional, skills: e.target.value }); handleFieldChange(); }}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
            />
          </div>
        </div>

        <div ref={interestsRef} className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600" /> Developer Interests
          </h3>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Interests & Domains (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. Web Development, AI & ML, Open Source, UI/UX Design, Hackathons"
              value={interests.interestedTeam}
              onChange={(e) => { setInterests({ ...interests, interestedTeam: e.target.value }); handleFieldChange(); }}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={handleCancel}
            className="min-h-[44px] bg-white hover:bg-slate-100 text-slate-700 border border-gray-300 font-semibold text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-6 flex items-center gap-2 cursor-pointer shadow-md"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save Changes
              </>
            )}
          </Button>
        </div>

      </form>

    </div>
  );
}

export default function ProfileEditPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-slate-500 font-semibold text-xs flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Loading profile editor...
        </div>
      </div>
    }>
      <ProfileEditContent />
    </Suspense>
  );
}
