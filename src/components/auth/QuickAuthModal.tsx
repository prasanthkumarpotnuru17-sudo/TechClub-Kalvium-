"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface QuickAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export function QuickAuthModal({ isOpen, onClose, initialMode = "login" }: QuickAuthModalProps) {
  const { loginWithEmail, signupWithEmail, loginWithGoogle, error, clearError } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleGoogleClick = async () => {
    setLocalError(null);
    clearError();
    setGoogleLoading(true);
    const ok = await loginWithGoogle();
    setGoogleLoading(false);
    if (ok) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!form.email || !form.password) return;

    if (mode === "signup" && form.password !== form.confirmPassword) {
      setLocalError("Passwords do not match. Please verify your password.");
      return;
    }

    setLoading(true);
    let ok = false;
    if (mode === "signup") {
      ok = await signupWithEmail(form.name || "Tech Member", form.email, form.password);
    } else {
      ok = await loginWithEmail(form.email, form.password);
    }
    setLoading(false);

    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    }
  };

  const displayError = localError || error;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "login" ? "Welcome Back to Student Portal" : "Join Tech Club by Kalvium"}
    >
      {success ? (
        <div className="text-center py-6 space-y-4">
          <div className="h-14 w-14 rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-gray-900">
              {mode === "signup" ? "Account Created Successfully!" : "Successfully Logged In"}
            </h4>
            <p className="text-xs text-gray-500 font-medium">Redirecting to your student dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === "login" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setLocalError(null);
                clearError();
              }}
              className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer ${
                mode === "signup" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Quick Sign Up
            </button>
          </div>

          {/* Friendly Error Banner */}
          {displayError && (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl border border-gray-300 bg-white hover:bg-gray-50 font-semibold text-xs md:text-sm text-gray-700 transition-all duration-200 shadow-sm cursor-pointer active:scale-98"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider absolute">Or</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Email Address</label>
              <input
                type="email"
                required
                placeholder="student.name@university.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white transition-colors"
              />
            </div>

            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-xs md:text-sm focus:border-blue-500 focus:outline-none bg-slate-50/50 focus:bg-white transition-colors"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full py-3 rounded-xl font-bold mt-1 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {mode === "signup" ? "Create Account" : "Access Portal"}
              <ArrowRight className="w-4 h-4" />
            </Button>

            <p className="text-center text-xs text-gray-500 font-medium pt-0.5">
              {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signup" ? "login" : "signup");
                  setLocalError(null);
                  clearError();
                }}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                {mode === "signup" ? "Log In" : "Quick Sign Up"}
              </button>
            </p>
          </form>
        </div>
      )}
    </Modal>
  );
}
