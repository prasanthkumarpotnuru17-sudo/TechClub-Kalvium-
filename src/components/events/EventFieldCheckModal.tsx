"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface EventFieldCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  missingFields: string[];
  onComplete: () => void;
}

export function EventFieldCheckModal({
  isOpen,
  onClose,
  eventTitle,
  missingFields,
  onComplete,
}: EventFieldCheckModalProps) {
  const { updateProfileData } = useProfile();
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const formatFieldLabel = (field: string) => {
    switch (field) {
      case "college": return "College / University Name";
      case "academicYear": return "Current Academic Year";
      case "course": return "Course / Degree";
      case "department": return "Department";
      case "company": return "Company / Organization";
      case "jobTitle": return "Job Title";
      case "github": return "GitHub Profile Link";
      case "linkedin": return "LinkedIn Profile Link";
      default: return field.charAt(0).toUpperCase() + field.slice(1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      // Map missing fields to appropriate profile sections
      const updatedPersonal: Record<string, string> = {};
      const updatedEdu: Record<string, string> = {};
      const updatedPro: Record<string, string> = {};
      const updatedSocials: Record<string, string> = {};

      Object.entries(fieldValues).forEach(([key, val]) => {
        if (["college", "course", "department", "academicYear"].includes(key)) {
          updatedEdu[key] = val;
        } else if (["company", "jobTitle", "skills"].includes(key)) {
          updatedPro[key] = val;
        } else if (["github", "linkedin"].includes(key)) {
          updatedSocials[key] = val;
        } else {
          updatedPersonal[key] = val;
        }
      });

      updateProfileData({
        personal: updatedPersonal,
        education: updatedEdu,
        professional: updatedPro,
        socials: updatedSocials,
      });

      setLoading(false);
      onClose();
      onComplete(); // Trigger event registration
    }, 600);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Required Profile Fields">
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Light Theme Alert Box */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed font-medium">
            To register for <strong className="text-amber-950 font-bold">{eventTitle}</strong>, please fill in these required fields:
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          {missingFields.map((field) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900">
                {formatFieldLabel(field)} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={`Enter your ${formatFieldLabel(field).toLowerCase()}`}
                value={fieldValues[field] || ""}
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, [field]: e.target.value })
                }
                className="w-full min-h-[46px] px-4 rounded-2xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400 transition-all font-medium"
              />
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
        >
          {loading ? "Saving & Registering..." : "Save & Complete Event Registration"}
          <ArrowRight className="w-4 h-4" />
        </Button>
      </form>
    </Modal>
  );
}
