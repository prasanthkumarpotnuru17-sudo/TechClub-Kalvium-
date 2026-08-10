import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile as updateFirebaseProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { auth, db, googleProvider } from "@/lib/firebase";
import { User, ParticipantType } from "@/types/auth";
import { UserProfile } from "@/types/profile";
import { calculateProfileCompletion } from "@/services/profileService";
import { teamAccessService } from "@/services/teamAccessService";

export interface FirebaseAuthResult {
  user: User;
  profile: UserProfile | null;
}

// Translate raw Firebase Auth error codes into friendly UI strings
export function formatFirebaseAuthError(errorCode: string): string {
  switch (errorCode) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Please check your credentials.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Please log in.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Google Sign-In popup was closed before completing authentication.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection.";
    default:
      return "Authentication failed. Please try again.";
  }
}

// Google Authentication
export async function loginWithGoogleService(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

// Email & Password Login
export async function loginWithEmailService(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

// Email & Password Signup (Creates Firebase Auth account only)
export async function signupWithEmailService(name: string, email: string, pass: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && result.user) {
    await updateFirebaseProfile(result.user, { displayName: name });
  }
  return result.user;
}

// Logout
export async function logoutService(): Promise<void> {
  await signOut(auth);
}

// Ensure or create Firestore users/{uid} document
export async function ensureFirestoreUserDocument(
  fUser: FirebaseUser,
  options?: { isRegistration?: boolean }
): Promise<User> {
  const userRef = doc(db, "users", fUser.uid);
  try {
    const userSnap = await getDoc(userRef);
    
    // Fetch effective role from team_access
    let userRole = "member";
    if (fUser.email) {
      userRole = await teamAccessService.fetchEffectiveRole(fUser.email, fUser.uid);
    }
    
    const nowIso = new Date().toISOString();
    const isRegistrationFlow = !!options?.isRegistration;

    if (userSnap.exists()) {
      const existing = userSnap.data() as User;
      const updatedLoginCount = (existing.loginCount || 0) + 1;
      const existingUser: User = {
        ...existing,
        role: userRole !== "member" ? (userRole as any) : (existing.role || "member"),
        accountStatus: existing.accountStatus || "active",
        lastLoginAt: nowIso,
        loginCount: updatedLoginCount,
        updatedAt: nowIso,
      };

      // Update login tracking metadata without triggering any welcome emails or webhooks for standard logins
      await safeSetDoc(userRef, {
        accountStatus: existing.accountStatus || "active",
        lastLoginAt: nowIso,
        loginCount: updatedLoginCount,
        updatedAt: nowIso,
      }, { merge: true });

      // CRITICAL FIX: If explicitly called from a Registration Flow (Email signup or Google Sign-In registration) AND welcome email has NOT been sent:
      if (isRegistrationFlow && fUser.email && !existing.welcomeEmailSent && existing.welcomeNotificationStatus !== "sending" && existing.welcomeNotificationStatus !== "sent") {
        console.log(`[Registration Flow] Triggering Welcome Email API for existing doc user ${fUser.uid} (${fUser.email})`);
        triggerWelcomeNotificationApi({
          userId: fUser.uid,
          userEmail: fUser.email,
          fullName: existing.fullName || existing.name || fUser.displayName || fUser.email.split("@")[0] || "Member"
        });
      }

      return existingUser;
    }

    const newUserDoc: User & Record<string, any> = {
      uid: fUser.uid,
      id: fUser.uid,
      name: fUser.displayName || fUser.email?.split("@")[0] || "",
      fullName: fUser.displayName || fUser.email?.split("@")[0] || "",
      email: fUser.email || "",
      avatar: fUser.photoURL || undefined,
      role: userRole as any,
      participantType: "Student",
      profileCompletion: 100,
      requiredFieldsCompleted: true,
      welcomeEmailSent: false,
      welcomeEmailSentAt: null,
      welcomeNotificationStatus: "pending",
      welcomeNotificationAttempts: 0,
      welcomeNotificationLastAttemptAt: null,
      accountStatus: "active",
      lastLoginAt: nowIso,
      loginCount: 1,
      createdAt: nowIso,
      registeredAt: nowIso,
      updatedAt: nowIso,
    };

    await safeSetDoc(userRef, newUserDoc, { merge: true });

    // Trigger Welcome Email Notification ONLY if explicitly executing within a new registration workflow
    if (isRegistrationFlow && fUser.email) {
      console.log(`[Registration Flow] Brand-new user doc created for ${fUser.uid}. Triggering Welcome Email API...`);
      triggerWelcomeNotificationApi({
        userId: fUser.uid,
        userEmail: fUser.email,
        fullName: newUserDoc.fullName || fUser.displayName || fUser.email.split("@")[0] || "Member"
      });
    }

    return newUserDoc;
  } catch (err) {
    console.error("Error creating initial Firestore user document:", err);
    
    // Fallback role check in catch block
    let userRole = "member";
    if (fUser.email) {
      try {
        userRole = await teamAccessService.fetchEffectiveRole(fUser.email, fUser.uid);
      } catch (_) {}
    }
    return {
      id: fUser.uid,
      name: fUser.displayName || fUser.email?.split("@")[0] || "",
      email: fUser.email || "",
      avatar: fUser.photoURL || undefined,
      role: userRole as any,
      participantType: "Student",
      profileCompletion: 100,
      requiredFieldsCompleted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// Fetch Firestore User & Profile Documents
export async function fetchFirestoreProfile(uid: string): Promise<{ userDoc: User | null; profileDoc: UserProfile | null }> {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const profileSnap = await getDoc(doc(db, "profiles", uid));

    const userDoc = userSnap.exists() ? (userSnap.data() as User) : null;
    const profileDoc = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;

    return { userDoc, profileDoc };
  } catch {
    return { userDoc: null, profileDoc: null };
  }
}

// Save Firestore User & Profile Documents with all flattened fields on users/{uid}
export async function saveFirestoreProfileData(
  uid: string,
  userPartial: Partial<User>,
  profileData: UserProfile
): Promise<void> {
  try {
    const flattenedUserRecord = {
      ...userPartial,
      displayName: userPartial.name || profileData.personal?.name,
      name: userPartial.name || profileData.personal?.name,
      email: userPartial.email,
      photoURL: userPartial.avatar,
      avatar: userPartial.avatar,
      phoneNumber: profileData.personal?.phone,
      phone: profileData.personal?.phone,
      college: profileData.education?.college,
      course: profileData.education?.course,
      department: profileData.education?.department,
      academicYear: profileData.education?.academicYear,
      city: profileData.personal?.city,
      bio: profileData.personal?.bio,
      github: profileData.socials?.github,
      linkedin: profileData.socials?.linkedin,
      portfolio: profileData.socials?.portfolio,
      skills: profileData.professional?.skills,
      interests: profileData.interests?.interestedTeam,
      participantType: userPartial.participantType,
      profileCompletion: userPartial.profileCompletion,
      updatedAt: new Date().toISOString(),
    };

    await safeSetDoc(doc(db, "users", uid), flattenedUserRecord, { merge: true });
    await safeSetDoc(doc(db, "profiles", uid), {
      ...profileData,
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // Also update Firebase Auth displayName & photoURL if changed
    if (auth.currentUser) {
      const updateObj: { displayName?: string; photoURL?: string } = {};
      if (userPartial.name) updateObj.displayName = userPartial.name;
      if (userPartial.avatar) updateObj.photoURL = userPartial.avatar;
      if (Object.keys(updateObj).length > 0) {
        await updateFirebaseProfile(auth.currentUser, updateObj);
      }
    }
  } catch (err) {
    console.error("Error saving profile to Firestore:", err);
  }
}

// Helper function to dispatch Welcome Email API route
function triggerWelcomeNotificationApi(payload: { userId: string; userEmail: string; fullName: string }) {
  if (typeof window === "undefined") return;

  console.log("[Welcome Notification Dispatcher] Posting to /api/notifications/welcome with payload:", payload);

  fetch("/api/notifications/welcome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notificationType: "WELCOME",
      userId: payload.userId,
      userEmail: payload.userEmail,
      fullName: payload.fullName,
    }),
  })
    .then(async (res) => {
      const data = await res.json();
      console.log(`[Welcome Notification Dispatcher] API Route Response (Status ${res.status}):`, data);
    })
    .catch((err) => {
      console.error("[Welcome Notification Dispatcher] Exception posting to API route:", err);
    });
}

