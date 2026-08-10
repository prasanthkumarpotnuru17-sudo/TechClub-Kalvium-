"use client";

import React, { useState } from "react";
import { Lock, Bell, Sun, Shield, Trash2, LogOut, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function AccountSettingsPage() {
  const { logout, deleteAccount } = useAuth();
  const [passForm, setPassForm] = useState({ current: "", newPass: "", confirm: "" });
  const [passSuccess, setPassSuccess] = useState(false);

  // Delete Account 2-Step Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPass !== passForm.confirm) {
      alert("New passwords do not match!");
      return;
    }
    setPassSuccess(true);
    setPassForm({ current: "", newPass: "", confirm: "" });
    setTimeout(() => setPassSuccess(false), 2500);
  };

  const openDeleteModal = () => {
    setModalStep(1);
    setConfirmInput("");
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setModalStep(1);
    setConfirmInput("");
    setDeleteError(null);
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      setDeleteError(err.message || "Failed to delete account. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-950">Account Settings & Security</h1>
        <p className="text-xs text-slate-500 font-medium">
          Manage your credentials, notification preferences, privacy controls, and security parameters.
        </p>
      </div>

      {passSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Password updated successfully in Firebase Authentication!
        </div>
      )}

      {/* 1. Change Password */}
      <form onSubmit={handlePasswordChange} className="p-6 rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" /> Change Account Password
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Current Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passForm.current}
              onChange={(e) => setPassForm({ ...passForm, current: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passForm.newPass}
              onChange={(e) => setPassForm({ ...passForm, newPass: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={passForm.confirm}
              onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 border border-gray-300 focus:outline-none focus:border-blue-600 focus:bg-white"
            />
          </div>
        </div>

        <Button type="submit" className="min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs cursor-pointer">
          Update Password
        </Button>
      </form>

      {/* 2. Notification Preferences */}
      <div className="p-6 rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
          <Bell className="w-5 h-5 text-purple-600" /> Broadcast & Notification Preferences
        </h3>

        <div className="space-y-3 text-xs font-semibold text-slate-700">
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-slate-50 border border-gray-200">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600" />
            <span>Email alerts for upcoming hackathons and bootcamp seat releases</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-2xl bg-slate-50 border border-gray-200">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-blue-600" />
            <span>Verification updates when certificates are issued</span>
          </label>
        </div>
      </div>

      {/* 3. Theme & Interface */}
      <div className="p-6 rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-600" /> Theme & Interface
        </h3>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-gray-200 flex items-center justify-between text-xs font-medium">
          <span>Active Workspace Theme</span>
          <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-slate-900 font-bold shadow-xs">
            Premium Light Theme (Active)
          </span>
        </div>
      </div>

      {/* 4. Logout & Danger Zone */}
      <div className="p-6 rounded-[24px] bg-white border border-gray-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
          <LogOut className="w-5 h-5 text-slate-700" /> Account Access
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-medium">Sign out of your active student session securely.</p>
          <Button
            onClick={() => logout()}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs rounded-xl min-h-[42px] shrink-0 cursor-pointer"
          >
            Log Out Now
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-[24px] bg-rose-50 border border-rose-200 space-y-4">
        <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" /> Danger Zone
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-rose-700 font-medium">
            Delete your account permanently along with your login credentials, profile data, and access permissions.
          </div>
          <Button
            onClick={openDeleteModal}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl min-h-[42px] shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete My Account
          </Button>
        </div>
      </div>

      {/* 2-STEP DELETE ACCOUNT MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-[28px] border border-gray-200 shadow-2xl overflow-hidden p-6 space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {modalStep === 1 ? "Delete Your Account?" : "Are you absolutely sure?"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Step {modalStep} of 2 • Permanent Account Removal
                  </p>
                </div>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold leading-relaxed">
                {deleteError}
              </div>
            )}

            {/* STEP 1 CONTENT */}
            {modalStep === 1 && (
              <div className="space-y-4">
                <div className="text-xs text-slate-600 space-y-2 leading-relaxed font-medium">
                  <p>
                    <strong className="text-slate-900">This action is permanent.</strong> Your profile data, login credentials, and workspace permissions will be deleted immediately.
                  </p>
                  <p className="text-slate-500">
                    Your past event registrations and issued certificates will be retained under anonymized records for administrative and verification purposes.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">
                    Type <span className="font-extrabold text-rose-600 tracking-wider">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Type DELETE"
                    className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-50 text-sm text-slate-900 font-mono border border-gray-300 focus:outline-none focus:border-rose-600 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDeleteModal}
                    className="min-h-[42px] rounded-xl text-xs font-bold text-slate-700 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={confirmInput !== "DELETE"}
                    onClick={() => setModalStep(2)}
                    className="min-h-[42px] rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 cursor-pointer"
                  >
                    Proceed to Final Step
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2 CONTENT */}
            {modalStep === 2 && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold space-y-2 leading-relaxed">
                  <p className="font-extrabold text-sm text-rose-900">
                    Final Warning: This action cannot be undone.
                  </p>
                  <p>
                    You will be signed out immediately and all active user sessions will be revoked. To access the platform again in the future, you must register as a new member.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isDeleting}
                    onClick={closeDeleteModal}
                    className="min-h-[42px] rounded-xl text-xs font-bold text-slate-700 border-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleFinalDelete}
                    className="min-h-[42px] rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting Account...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Permanently Delete Account
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
