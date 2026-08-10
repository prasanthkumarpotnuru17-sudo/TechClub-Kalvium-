"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthUser, ParticipantType, UserProfileData } from "@/lib/services/mockData";

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  updateProfile: (participantType: ParticipantType, profile: UserProfileData) => void;
  logout: () => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  eventIntentTitle?: string;
  triggerEventRegistrationGated: (eventTitle: string, onComplete: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [eventIntentTitle, setEventIntentTitle] = useState<string | undefined>(undefined);
  const [pendingEventAction, setPendingEventAction] = useState<(() => void) | null>(null);

  // Initialize demo user state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tech_club_auth_user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // LocalStorage fallback
    }
  }, []);

  const saveUserToState = (updatedUser: AuthUser | null) => {
    setUser(updatedUser);
    try {
      if (updatedUser) {
        localStorage.setItem("tech_club_auth_user", JSON.stringify(updatedUser));
      } else {
        localStorage.removeItem("tech_club_auth_user");
      }
    } catch {
      // LocalStorage fallback
    }
  };

  const login = async (email: string): Promise<boolean> => {
    const mockUser: AuthUser = {
      id: `usr-${Date.now()}`,
      name: email.split("@")[0] || "Tech Student",
      email,
      profileCompleted: false,
      participantType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {
        course: "B.Tech Computer Science",
        academicYear: "1st Year",
      },
    };

    saveUserToState(mockUser);
    setIsOnboardingOpen(true);
    return true;
  };

  const signup = async (name: string, email: string): Promise<boolean> => {
    const newUser: AuthUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      profileCompleted: false,
      participantType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {},
    };

    saveUserToState(newUser);
    setIsOnboardingOpen(true);
    return true;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    const googleUser: AuthUser = {
      id: `usr-google-${Date.now()}`,
      name: "Google Student",
      email: "google.student@university.edu",
      profileCompleted: false,
      participantType: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      profile: {},
    };

    saveUserToState(googleUser);
    setIsOnboardingOpen(true);
    return true;
  };

  const updateProfile = (participantType: ParticipantType, profile: UserProfileData) => {
    if (!user) return;
    const updated: AuthUser = {
      ...user,
      profileCompleted: true,
      participantType,
      profile: { ...user.profile, ...profile },
      updatedAt: new Date().toISOString(),
    };

    saveUserToState(updated);
    setIsOnboardingOpen(false);

    // If there was a pending event registration intent, complete it now!
    if (pendingEventAction) {
      pendingEventAction();
      setPendingEventAction(null);
      setEventIntentTitle(undefined);
    }
  };

  const logout = () => {
    saveUserToState(null);
    setIsOnboardingOpen(false);
  };

  const triggerEventRegistrationGated = (eventTitle: string, onComplete: () => void) => {
    if (user && user.profileCompleted) {
      onComplete();
    } else {
      setEventIntentTitle(eventTitle);
      setPendingEventAction(() => onComplete);
      setIsOnboardingOpen(true);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        loginWithGoogle,
        updateProfile,
        logout,
        isOnboardingOpen,
        setIsOnboardingOpen,
        eventIntentTitle,
        triggerEventRegistrationGated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
