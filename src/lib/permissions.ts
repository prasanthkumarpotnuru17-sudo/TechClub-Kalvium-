import { PlatformRole } from "@/types/auth";

export const Permissions = {
  CREATE_EVENT: ["super_admin", "admin"],
  EDIT_EVENT: ["super_admin", "admin"],
  DELETE_EVENT: ["super_admin"], // Only super_admin can permanently delete
  ARCHIVE_EVENT: ["super_admin", "admin"],
  ADD_PARTICIPANT: ["super_admin", "admin"],
  REMOVE_PARTICIPANT: ["super_admin", "admin"],
  IMPORT_CSV: ["super_admin", "admin"],
  EXPORT_CSV: ["super_admin", "admin", "coordinator"],
  MANAGE_USERS: ["super_admin"],
  MANAGE_ROLES: ["super_admin"],
  GENERATE_CERTIFICATES: ["super_admin", "admin", "coordinator"],
  VIEW_ANALYTICS: ["super_admin", "admin", "coordinator"]
} as const;

export type PermissionKey = keyof typeof Permissions;

export function hasPermission(role: string | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const normalizedRole = role.toLowerCase() as PlatformRole;
  return (Permissions[permission] as readonly PlatformRole[]).includes(normalizedRole);
}
