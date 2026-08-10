"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  User as UserIcon, Calendar, Award, Bell, Settings, LogOut, ChevronDown 
} from "lucide-react";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ProfileDropdown } from "@/components/auth/ProfileDropdown";
import { announcementService } from "@/services/announcementService";

function ProfileLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [notificationCount, setNotificationCount] = React.useState(0);

  React.useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router]);

  React.useEffect(() => {
    const { getReadNotificationIds } = require("@/lib/services/notificationReadStorage");

    let currentAnns: any[] = [];
    const updateUnreadCount = (anns: any[]) => {
      const readIds = getReadNotificationIds(user?.uid || user?.id);
      const unread = anns.filter((a) => !readIds.includes(a.id)).length;
      setNotificationCount(unread);
    };

    const unsub = announcementService.subscribeAnnouncements((anns) => {
      currentAnns = anns;
      updateUnreadCount(anns);
    });

    const handleReadChange = () => {
      updateUnreadCount(currentAnns);
    };

    window.addEventListener("notification_read_change", handleReadChange);

    return () => {
      unsub();
      window.removeEventListener("notification_read_change", handleReadChange);
    };
  }, [user?.uid, user?.id]);

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "PK";

  const navItems = [
    { label: "Profile Overview", href: "/profile", icon: UserIcon },
    { label: "My Events", href: "/profile/events", icon: Calendar },
    { label: "Certificates", href: "/profile/certificates", icon: Award },
    { label: "Notifications", href: "/profile/notifications", icon: Bell, badge: notificationCount > 0 ? notificationCount : undefined },
    { label: "Settings", href: "/profile/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans antialiased">
      
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200/80 px-6 md:px-12 py-3 flex items-center justify-between shadow-xs">
        
        {/* Brand Logo - Matched to Main Navbar */}
        <Link href="/" className="flex flex-col items-start leading-none group select-none shrink-0">
          <span className="font-display font-medium tracking-tight text-gray-950 text-2xl md:text-3xl transition-colors duration-250 group-hover:text-blue-600">
            Tech Club
          </span>
          <span className="text-[11px] font-bold text-red-600 tracking-tight">
            Kalvium
          </span>
        </Link>

        {/* Center Website Nav Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
          <Link href="/#events" className="hover:text-blue-600 transition-colors">Events</Link>
          <Link href="/#announcements" className="hover:text-blue-600 transition-colors">Announcements</Link>
          <Link href="/#team" className="hover:text-blue-600 transition-colors">Team</Link>
          <Link href="/#updates" className="hover:text-blue-600 transition-colors">Updates</Link>
          <Link href="/#faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
          <Link href="/#contact" className="hover:text-blue-600 transition-colors">Contact</Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <Link
            href="/profile/notifications"
            className="relative p-2.5 rounded-full border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
            )}
          </Link>

          {/* Interactive Profile Dropdown Menu */}
          <ProfileDropdown />
        </div>
      </header>

      {/* 2. Main Two-Column Body */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar */}
        <aside className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-200/80 rounded-2xl p-3 shadow-xs space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === "/profile" && pathname === "/profile/edit");
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50/90 text-blue-600 font-bold"
                      : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-2 border-t border-gray-100 mt-2">
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 min-h-[44px] px-4 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="lg:col-span-9 space-y-6">
          {children}
        </main>
      </div>

    </div>
  );
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileLayoutContent>{children}</ProfileLayoutContent>
    </AuthProvider>
  );
}
