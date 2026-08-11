import { PlatformRole } from "@/types/auth";

export function normalizeRole(role?: string | null): PlatformRole {
  if (!role) return "member";
  const r = role.toLowerCase().trim();
  if (r === "super_admin" || r === "superadmin" || r === "super admin") return "super_admin";
  if (r === "admin") return "admin";
  if (r === "coordinator") return "coordinator";
  return "member";
}

export function isSuperAdmin(role?: string | null): boolean {
  return normalizeRole(role) === "super_admin";
}

export function isAdmin(role?: string | null): boolean {
  return normalizeRole(role) === "admin";
}

export function isCoordinator(role?: string | null): boolean {
  return normalizeRole(role) === "coordinator";
}

export function isMember(role?: string | null): boolean {
  return normalizeRole(role) === "member";
}

export function isAdminOrAbove(role?: string | null): boolean {
  const norm = normalizeRole(role);
  return norm === "super_admin" || norm === "admin" || norm === "coordinator";
}

export function hasPermission(role?: string | null, permission?: string): boolean {
  if (isSuperAdmin(role)) return true;
  if (isAdminOrAbove(role)) return true;
  return false;
}

/**
 * Community Chat is for official Tech Club Members, Coordinators, Admins, and Super Admins.
 * Normal website students/users do NOT automatically receive chat access.
 */
export function canAccessCommunityChat(role?: string | null, isTechClubMember?: boolean): boolean {
  if (isAdminOrAbove(role)) return true;
  return !!isTechClubMember;
}

/**
 * ONLY Super Admin can delete user accounts.
 * Admin, Coordinator, and Member roles MUST NOT delete users.
 */
export function canDeleteUser(role?: string | null): boolean {
  return isSuperAdmin(role);
}

/**
 * ONLY Super Admin can manage user roles and promote to Super Admin.
 */
export function canManageRoles(role?: string | null): boolean {
  return isSuperAdmin(role);
}

export function canPromoteToSuperAdmin(role?: string | null): boolean {
  return isSuperAdmin(role);
}

/**
 * Super Admin, Admin, and Coordinator can moderate chat.
 */
export function canModerateChat(role?: string | null): boolean {
  return isAdminOrAbove(role);
}

/**
 * ONLY Super Admin can post TASK messages in the Community Chat.
 */
export function canPostTasks(role?: string | null): boolean {
  return isSuperAdmin(role);
}

/**
 * Chat message deletion:
 * - Super Admin can delete any message.
 * - Admin/Coordinator/Member can delete ONLY their own message.
 */
export function canDeleteChatMessage(
  currentRole: string | null | undefined,
  messageSenderId: string | null | undefined,
  currentUserId: string | null | undefined
): boolean {
  if (isSuperAdmin(currentRole)) return true;
  if (messageSenderId && currentUserId && messageSenderId === currentUserId) return true;
  return false;
}
