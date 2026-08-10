"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "coordinator"].includes(normalizedRole);

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Access Denied state for non-admin users
  if (!isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 px-4 text-center">
        <div className="max-w-md space-y-5 p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">No Admin Access</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Your account is signed in successfully,<br />but you are not a member of the Tech Club Team.
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you believe this is an error,<br />please contact the Super Admin.
            </p>
          </div>
          <Button
            onClick={() => router.push("/")}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl min-h-[48px] flex items-center justify-center gap-2 cursor-pointer"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

