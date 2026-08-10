"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { User, ParticipantType } from "@/types/auth";
import { UserProfile } from "@/types/profile";
import { 
  loginWithGoogleService, 
  loginWithEmailService, 
  signupWithEmailService, 
  logoutService, 
  fetchFirestoreProfile,
  ensureFirestoreUserDocument,
  saveFirestoreProfileData,
  formatFirebaseAuthError
} from "@/services/authService";
import { calculateProfileCompletion, createInitialProfile, CompletionItem } from "@/services/profileService";
import { teamAccessService } from "@/services/teamAccessService";
import { userService } from "@/services/userService";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  profile: UserProfile | null;
  role: string;
  completionItems: CompletionItem[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, pass: string) => Promise<boolean>;
  signupWithEmail: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  updateParticipantType: (type: ParticipantType) => void;
  updateProfileData: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  updateAvatar: (photoUrlOrBase64: string) => Promise<void>;
  dismissOnboarding: () => void;
  isQuickAuthOpen: boolean;
  setIsQuickAuthOpen: (open: boolean) => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isProfileViewOpen: boolean;
  setIsProfileViewOpen: (open: boolean) => void;
  pendingEventCheck: { eventTitle: string; missingFields: string[]; onComplete: () => void } | null;
  setPendingEventCheck: (val: { eventTitle: string; missingFields: string[]; onComplete: () => void } | null) => void;
  checkEventRegistrationFields: (eventTitle: string, requiredFields: string[], onComplete: () => void) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<string>("member");
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Controls
  const [isQuickAuthOpen, setIsQuickAuthOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [pendingEventCheck, setPendingEventCheck] = useState<{ eventTitle: string; missingFields: string[]; onComplete: () => void } | null>(null);

  const clearError = () => setError(null);

  // Single onAuthStateChanged listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fUser: FirebaseUser | null) => {
      setFirebaseUser(fUser);
      clearError();

      if (fUser) {
        try {
          const userDoc = await ensureFirestoreUserDocument(fUser);
          const { profileDoc } = await fetchFirestoreProfile(fUser.uid);
          
          // Fetch effective role from team_access
          let userRole = "member";
          if (fUser.email) {
            userRole = await teamAccessService.fetchEffectiveRole(fUser.email, fUser.uid);
          }
          
          setRole(userRole);
          
          const fallbackProfile = profileDoc || createInitialProfile(fUser.uid, userDoc.name);
          const { completion, requiredCompleted, items } = calculateProfileCompletion(userDoc.participantType, fallbackProfile, userDoc.avatar);
          
          const updatedUser: User = {
            ...userDoc,
            uid: fUser.uid,   // Always inject authoritative Firebase UID
            id: fUser.uid,    // Ensure id is also the Firebase UID
            role: userRole as any,
            profileCompletion: completion,
            requiredFieldsCompleted: requiredCompleted,
          };

          setUser(updatedUser);
          setProfile(fallbackProfile);
          setCompletionItems(items);

          // Open onboarding wizard only if profile has not been completed or dismissed
          const isDismissedInStorage = typeof window !== "undefined" && localStorage.getItem(`onboarding_completed_${fUser.uid}`) === "true";
          if (!userDoc.onboardingCompleted && !isDismissedInStorage && completion < 50 && !requiredCompleted) {
            setIsOnboardingOpen(true);
          } else {
            setIsOnboardingOpen(false);
          }
        } catch (authInitErr: any) {
          console.error("[AuthContext] Exception initializing user profile:", authInitErr);
        }
      } else {
        setUser(null);
        setProfile(null);
        setCompletionItems([]);
        setRole("member");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (): Promise<boolean> => {
    setError(null);
    try {
      if (typeof window !== "undefined") sessionStorage.setItem("is_explicit_signup", "true");
      const fUser = await loginWithGoogleService();
      if (fUser) {
        const { doc: firestoreDoc, getDoc: getFirestoreDoc } = await import("firebase/firestore");
        const { db: firestoreDb } = await import("@/lib/firebase");
        const userRef = firestoreDoc(firestoreDb, "users", fUser.uid);
        const userSnap = await getFirestoreDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        // Determine first registration: doc doesn't exist OR doc exists but welcome email not sent and login count <= 1
        const isFirstRegistration = !userSnap.exists() || (!userData?.welcomeEmailSent && (!userData?.loginCount || userData?.loginCount <= 1));
        await ensureFirestoreUserDocument(fUser, { isRegistration: isFirstRegistration });
      }
      setIsQuickAuthOpen(false);
      return true;
    } catch (err: any) {
      setError(formatFirebaseAuthError(err?.code || ""));
      return false;
    }
  };

  const loginWithEmail = async (email: string, pass: string): Promise<boolean> => {
    setError(null);
    try {
      if (typeof window !== "undefined") sessionStorage.removeItem("is_explicit_signup");
      await loginWithEmailService(email, pass);
      setIsQuickAuthOpen(false);
      return true;
    } catch (err: any) {
      setError(formatFirebaseAuthError(err?.code || ""));
      return false;
    }
  };

  const signupWithEmail = async (name: string, email: string, pass: string): Promise<boolean> => {
    setError(null);
    try {
      if (typeof window !== "undefined") sessionStorage.setItem("is_explicit_signup", "true");
      const fUser = await signupWithEmailService(name, email, pass);
      if (fUser) {
        await ensureFirestoreUserDocument(fUser, { isRegistration: true });
      }
      setIsQuickAuthOpen(false);
      return true;
    } catch (err: any) {
      setError(formatFirebaseAuthError(err?.code || ""));
      return false;
    }
  };

  const dismissOnboarding = () => {
    setIsOnboardingOpen(false);
    if (user) {
      if (typeof window !== "undefined") {
        localStorage.setItem(`onboarding_completed_${user.id}`, "true");
      }
      const updatedUser: User = { ...user, onboardingCompleted: true };
      setUser(updatedUser);
      if (profile) {
        saveFirestoreProfileData(user.id, updatedUser, profile);
      }
    }
  };

  const logout = async (): Promise<void> => {
    setError(null);
    await logoutService();
    setIsQuickAuthOpen(false);
    setIsOnboardingOpen(false);
    setIsProfileViewOpen(false);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const deleteAccount = async (): Promise<void> => {
    setError(null);
    if (!firebaseUser) {
      throw new Error("No active authenticated session found.");
    }
    const token = await firebaseUser.getIdToken(true);
    await userService.deleteUserAccount(token);
    await logoutService();
    setIsQuickAuthOpen(false);
    setIsOnboardingOpen(false);
    setIsProfileViewOpen(false);
    setUser(null);
    setProfile(null);
    setFirebaseUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  const updateParticipantType = (type: ParticipantType) => {
    if (!user || !profile) return;
    const { completion, requiredCompleted, items } = calculateProfileCompletion(type, profile, user.avatar);
    const updatedUser: User = {
      ...user,
      participantType: type,
      profileCompletion: completion,
      requiredFieldsCompleted: requiredCompleted,
      updatedAt: new Date().toISOString(),
    };
    setUser(updatedUser);
    setCompletionItems(items);
    saveFirestoreProfileData(user.id, updatedUser, profile);
  };

  const updateProfileData = async (updatedProfilePartial: Partial<UserProfile>): Promise<void> => {
    if (!user || !profile) return;
    const mergedProfile: UserProfile = {
      ...profile,
      personal: { ...profile.personal, ...updatedProfilePartial.personal },
      education: { ...profile.education, ...updatedProfilePartial.education },
      professional: { ...profile.professional, ...updatedProfilePartial.professional },
      socials: { ...profile.socials, ...updatedProfilePartial.socials },
      interests: { ...profile.interests, ...updatedProfilePartial.interests },
      updatedAt: new Date().toISOString(),
    };

    const { completion, requiredCompleted, items } = calculateProfileCompletion(user.participantType, mergedProfile, user.avatar);
    const updatedUser: User = {
      ...user,
      name: mergedProfile.personal.name || user.name,
      profileCompletion: completion,
      requiredFieldsCompleted: requiredCompleted,
      updatedAt: new Date().toISOString(),
    };

    setUser(updatedUser);
    setProfile(mergedProfile);
    setCompletionItems(items);
    await saveFirestoreProfileData(user.id, updatedUser, mergedProfile);
  };

  const updateAvatar = async (photoUrlOrBase64: string): Promise<void> => {
    if (!user || !profile) return;
    const { completion, requiredCompleted, items } = calculateProfileCompletion(user.participantType, profile, photoUrlOrBase64);
    const updatedUser: User = {
      ...user,
      avatar: photoUrlOrBase64,
      profileCompletion: completion,
      requiredFieldsCompleted: requiredCompleted,
      updatedAt: new Date().toISOString(),
    };

    setUser(updatedUser);
    setCompletionItems(items);
    await saveFirestoreProfileData(user.id, updatedUser, profile);
  };

  const checkEventRegistrationFields = (
    eventTitle: string,
    requiredFields: string[],
    onComplete: () => void
  ) => {
    if (!user || !profile) {
      setIsQuickAuthOpen(true);
      return;
    }

    const missing: string[] = [];
    const flattenedProfile: Record<string, unknown> = {
      ...profile.personal,
      ...profile.education,
      ...profile.professional,
      ...profile.socials,
      ...profile.interests,
    };

    requiredFields.forEach((field) => {
      if (!flattenedProfile[field]) {
        missing.push(field);
      }
    });

    if (missing.length === 0) {
      onComplete();
    } else {
      setPendingEventCheck({
        eventTitle,
        missingFields: missing,
        onComplete,
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        profile,
        role,
        completionItems,
        isAuthenticated: !!user,
        loading,
        error,
        clearError,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        deleteAccount,
        updateParticipantType,
        updateProfileData,
        updateAvatar,
        dismissOnboarding,
        isQuickAuthOpen,
        setIsQuickAuthOpen,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isProfileViewOpen,
        setIsProfileViewOpen,
        pendingEventCheck,
        setPendingEventCheck,
        checkEventRegistrationFields,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within an AuthProvider");
  return ctx;
}
