export type PlatformRole = "super_admin" | "admin" | "coordinator" | "member";
export type ParticipantType = "Student" | "Professional" | "Mentor" | "Alumni" | "Volunteer";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: PlatformRole;
  participantType: ParticipantType | null;
  profileCompletion: number; // 0 - 100
  requiredFieldsCompleted: boolean;
  uid?: string;
  fullName?: string;
  onboardingCompleted?: boolean;
  welcomeEmailSent?: boolean;
  welcomeEmailSentAt?: string | null;
  accountStatus?: "active" | "inactive" | "suspended" | string;
  lastLoginAt?: string | null;
  loginCount?: number;
  welcomeNotificationStatus?: "pending" | "sending" | "sent" | "failed" | string | null;
  welcomeNotificationAttempts?: number;
  welcomeNotificationLastAttemptAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
