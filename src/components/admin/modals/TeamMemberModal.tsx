"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, Upload, Image as ImageIcon, Edit2 } from "lucide-react";
import { motion } from "framer-motion";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (memberData: any, id?: string) => void;
  onAdd?: (memberData: any) => void;
  memberToEdit?: any;
}

export function TeamMemberModal({ isOpen, onClose, onSave, onAdd, memberToEdit }: TeamMemberModalProps) {
  const [form, setForm] = useState({
    name: "",
    roleGroup: "Core Team" as any,
    designation: "",
    bio: "",
    email: "",
    phone: "",
    department: "AI & Machine Learning",
    avatar: "",
    github: "",
    linkedin: "",
  });

  useEffect(() => {
    if (memberToEdit) {
      setForm({
        name: memberToEdit.name || "",
        roleGroup: memberToEdit.roleGroup || "Core Team",
        designation: memberToEdit.designation || memberToEdit.role || "",
        bio: memberToEdit.bio || "",
        email: memberToEdit.email || "",
        phone: memberToEdit.phone || "",
        department: memberToEdit.department || "AI & Machine Learning",
        avatar: memberToEdit.avatar || "",
        github: memberToEdit.github || "",
        linkedin: memberToEdit.linkedin || "",
      });
    } else {
      setForm({
        name: "",
        roleGroup: "Core Team",
        designation: "",
        bio: "",
        email: "",
        phone: "",
        department: "AI & Machine Learning",
        avatar: "",
        github: "",
        linkedin: "",
      });
    }
  }, [memberToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    if (onSave) {
      onSave(form, memberToEdit?.id);
    } else if (onAdd) {
      onAdd(form);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-modal w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative border border-gray-200 dark:border-gray-800 max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full bg-gray-100 dark:bg-gray-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          {memberToEdit ? (
            <Edit2 className="w-5 h-5 text-indigo-500" />
          ) : (
            <UserPlus className="w-5 h-5 text-indigo-500" />
          )}
          {memberToEdit ? "Edit Leadership Team Member" : "Add Leadership Team Member"}
        </h3>
        <p className="text-xs text-gray-500 mb-6">Assign roles to faculty leads, domain leads, or core volunteers.</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs md:text-sm">
          {/* Profile Photo Upload / URL Field */}
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Profile Photo / Avatar Image
            </label>
            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <div className="relative shrink-0">
                {form.avatar ? (
                  <img
                    src={form.avatar}
                    alt="Preview"
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/30 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-dashed border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-500">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={form.avatar}
                  onChange={(e) => setForm({ ...form, avatar: e.target.value })}
                  placeholder="Paste image URL (https://...)"
                  className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-xs"
                />

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image File</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>

                  {form.avatar && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, avatar: "" })}
                      className="text-xs text-red-500 font-semibold hover:underline cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Prasanth kumar Potnuru"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Category / Role Group</label>
              <select
                value={form.roleGroup}
                onChange={(e) => setForm({ ...form, roleGroup: e.target.value as any })}
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="Student Leads">Domain Leads (Student Leads)</option>
                <option value="Core Team">Core Board (Core Team)</option>
                <option value="Faculty Coordinators">Faculty Advisors (Coordinators)</option>
                <option value="Volunteers">Volunteers</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Designation / Role Title</label>
              <input
                type="text"
                required
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
                placeholder="e.g. DOMAIN LEAD"
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Bio / Short Description</label>
            <input
              type="text"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="e.g. Domain lead managing technical projects and workshops."
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="email@kalvium.community"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Mobile / Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">LinkedIn URL</label>
              <input
                type="text"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">GitHub URL (Optional)</label>
            <input
              type="text"
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
              placeholder="https://github.com/username"
              className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              {memberToEdit ? "Save Changes" : "Add Crew Member"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
