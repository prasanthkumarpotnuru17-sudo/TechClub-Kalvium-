"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ArrowRight, Bell, Sparkles, LayoutDashboard, User as UserIcon, Calendar, Award, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { SearchInput } from "@/components/ui/search-input";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { ProfileDropdown } from "@/components/auth/ProfileDropdown";

interface NavbarProps {
  onLoginClick: () => void;
  onJoinClick: () => void;
}

export function Navbar({ onLoginClick, onJoinClick }: NavbarProps) {
  const { user, isAuthenticated, role, participantType, profileCompletion, setIsProfileViewOpen, logout } = useAuth();
  const normalizedRole = (role || "").toLowerCase();
  const isAdmin = ["admin", "super_admin", "coordinator"].includes(normalizedRole);

  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUnreadNotification, setHasUnreadNotification] = useState(true);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Events", href: "/events" },
    { label: "Announcements", href: "/announcements" },
    { label: "Team", href: "/#team" },
    { label: "Updates", href: "/#whatsapp-updates" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = ["team", "whatsapp-updates", "faq", "contact"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    setIsOpen(false);

    if (href === "/" || href === "#home" || href === "/#home") {
      if (typeof window !== "undefined" && window.location.pathname === "/") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    if (href.includes("#")) {
      const hash = href.split("#")[1];
      const element = document.getElementById(hash);

      if (element && typeof window !== "undefined" && window.location.pathname === "/") {
        e.preventDefault();
        const offsetTop = element.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.location.pathname === "/") {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const userInitials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ST";

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 pt-4 pb-2 px-4 transition-all duration-300">
        <nav
          className={cn(
            "mx-auto max-w-7xl rounded-full px-4 py-3 md:px-8 transition-all duration-500",
            scrolled ? "glass-navbar py-2.5 md:py-3" : "bg-transparent border-transparent"
          )}
        >
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link 
              href="/" 
              onClick={handleLogoClick}
              className="flex flex-col items-start leading-none group select-none shrink-0"
            >
              <span className="font-display font-medium tracking-tight text-gray-950 text-3xl md:text-4xl transition-colors duration-250 group-hover:text-blue-600">
                Tech Club
              </span>
              <span className="text-xs font-semibold text-red-600 self-end -mt-0.5 tracking-normal">
                Kalvium
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <ul className="hidden xl:flex items-center gap-1.5 xl:gap-2.5">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.substring(1);
                return (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className={cn(
                        "relative px-4 py-2 text-sm font-medium transition-colors duration-300 rounded-full hover:text-blue-600 cursor-pointer",
                        isActive ? "text-blue-600" : "text-gray-600"
                      )}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="nav-pill"
                          className="absolute inset-0 bg-blue-50/50 rounded-full -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            {/* Desktop Authenticated / Unauthenticated Navigation Segment */}
            <div className="hidden xl:flex items-center gap-3">
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  {/* Notification Bell Link */}
                  <Link
                    href="/profile/notifications"
                    className="relative p-2 rounded-full border border-gray-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4 text-slate-700" />
                    {hasUnreadNotification && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white animate-pulse" />
                    )}
                  </Link>

                  {/* Single Unified Profile Dropdown */}
                  <ProfileDropdown />
                </div>
              ) : (
                /* Unauthenticated View: Log In & Join Buttons */
                <>
                  <button
                    onClick={onLoginClick}
                    suppressHydrationWarning
                    className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-4 py-2 transition-colors duration-200 cursor-pointer"
                  >
                    Log In
                  </button>
                  <Button onClick={onJoinClick} variant="secondary" size="sm" className="group rounded-full shadow-xs hover:shadow-md transition-all">
                    Join Club
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Menu & Quick Avatar */}
            <div className="xl:hidden flex items-center gap-2">
              {isAuthenticated && user ? (
                <Link
                  href="/profile"
                  className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm overflow-hidden"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </Link>
              ) : (
                <Button 
                  onClick={onJoinClick} 
                  variant="primary" 
                  size="sm" 
                  className="text-xs px-4 py-2.5 min-h-[44px] rounded-full active:scale-97 transition-transform"
                >
                  Join
                </Button>
              )}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[48px] min-w-[48px] p-3 rounded-full text-gray-700 hover:bg-gray-100/80 active:scale-97 transition-all duration-200 border border-gray-200/80 flex items-center justify-center cursor-pointer bg-white/60 backdrop-blur-md shadow-xs"
                aria-label="Toggle menu"
              >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Drawer */}
      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} title="Menu Navigation">
        <div className="flex flex-col gap-4 py-2">
          
          {/* If Authenticated: Mobile Profile Card inside Drawer */}
          {isAuthenticated && user && (
            <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shrink-0 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase">
                  {role}
                </span>
                {participantType && (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-bold uppercase">
                    {participantType}
                  </span>
                )}
                <span className="ml-auto text-xs font-mono text-blue-400 font-bold">{profileCompletion}%</span>
              </div>

              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          )}

          {/* Reusable SearchInput UI primitive */}
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search pages, events, team..."
          />

          {/* Navigation Links */}
          <ul className="flex flex-col gap-1 pt-1">
            {navLinks
              .filter((l) => l.label.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((link, idx) => (
              <motion.li
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                key={link.label}
              >
                <Link
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className={cn(
                    "flex items-center min-h-[48px] px-4 text-base font-bold rounded-2xl transition-all duration-200 active:scale-97 cursor-pointer",
                    activeSection === link.href.substring(1)
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-800 hover:bg-gray-50 hover:text-blue-600"
                  )}
                >
                  {link.label}
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Drawer Bottom Actions */}
        <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 mb-[env(safe-area-inset-bottom,16px)]">
          {isAuthenticated && user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="w-full min-h-[48px] px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-sm flex items-center gap-2 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-blue-600" />
                  <span>Dashboard</span>
                </Link>
              )}
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span>My Profile & Settings</span>
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full min-h-[48px] px-4 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLoginClick();
                }}
                className="w-full min-h-[52px] text-center text-base font-bold text-gray-800 bg-gray-100/80 hover:bg-gray-100 rounded-2xl active:scale-97 transition-all cursor-pointer flex items-center justify-center"
              >
                Log In
              </button>
              <Button
                onClick={() => {
                  setIsOpen(false);
                  onJoinClick();
                }}
                variant="secondary"
                className="w-full min-h-[52px] text-base rounded-2xl flex justify-center items-center font-bold active:scale-97 shadow-md"
              >
                Join Club
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </Drawer>
    </>
  );
}
