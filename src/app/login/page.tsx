"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, role, loading, setIsQuickAuthOpen } = useAuth();

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          const normalizedRole = (role || "").toLowerCase();
          const isAdmin = ["admin", "super_admin", "coordinator"].includes(normalizedRole);
          if (isAdmin) {
            router.push("/admin");
          } else {
            router.push("/profile");
          }
        } else {
          setIsQuickAuthOpen(true);
          router.push("/");
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, role, loading, router, setIsQuickAuthOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500">Redirecting to Login...</p>
      </div>
    </div>
  );
}
