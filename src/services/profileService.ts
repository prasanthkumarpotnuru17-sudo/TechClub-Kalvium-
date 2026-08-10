import { UserProfile } from "@/types/profile";
import { User, ParticipantType } from "@/types/auth";

export interface CompletionItem {
  key: string;
  label: string;
  completed: boolean;
}

export function calculateProfileCompletion(
  participantType: ParticipantType | null,
  profile: UserProfile,
  avatar?: string
): { completion: number; requiredCompleted: boolean; items: CompletionItem[] } {
  const isStudent = participantType === "Student" || !participantType;

  const roleItem: CompletionItem = isStudent
    ? { key: "education", label: "Education & University", completed: !!(profile.education?.college && profile.education?.academicYear) }
    : { key: "professional", label: "Company & Designation", completed: !!(profile.professional?.company && profile.professional?.jobTitle) };

  const items: CompletionItem[] = [
    { key: "personal", label: "Personal Information", completed: !!(profile.personal?.name && profile.personal?.city) },
    roleItem,
    { key: "phone", label: "Phone Number", completed: !!profile.personal?.phone },
    { key: "bio", label: "Developer Bio", completed: !!profile.personal?.bio },
    { key: "github", label: "GitHub Profile", completed: !!profile.socials?.github },
    { key: "linkedin", label: "LinkedIn Profile", completed: !!profile.socials?.linkedin },
    { key: "photo", label: "Profile Photo", completed: !!(avatar && !avatar.includes("default")) },
  ];

  let completedCount = items.filter((i) => i.completed).length;
  let completion = Math.min(100, Math.max(25, Math.round((completedCount / items.length) * 100)));

  const requiredOk = isStudent
    ? !!profile.education?.college
    : !!profile.professional?.company;

  return { completion, requiredCompleted: requiredOk, items };
}

export function createInitialProfile(userId: string, name: string): UserProfile {
  return {
    userId,
    personal: { name },
    education: {},
    professional: {},
    socials: {},
    interests: {},
    updatedAt: new Date().toISOString(),
  };
}
