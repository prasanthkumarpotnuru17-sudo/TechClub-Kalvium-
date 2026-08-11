"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  ShieldCheck,
  UserCheck,
  Ban,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  MoreVertical,
  Plus,
  ShieldAlert,
  Edit3
} from "lucide-react";
import { UserItem } from "@/lib/services/mockData";
import { userService } from "@/services/userService";
import { teamAccessService, TeamAccess } from "@/services/teamAccessService";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";
import { isSuperAdmin as checkIsSuperAdmin, canDeleteUser, canManageRoles, canPromoteToSuperAdmin } from "@/lib/permissions";

interface UsersViewProps {
  onOpenProfileModal: (usr: UserItem) => void;
}

export function UsersView({ onOpenProfileModal }: UsersViewProps) {
  const { role: currentUserRole, user: currentUser } = useAuth();
  const userEffectiveRole = currentUserRole || (currentUser as any)?.role || "member";
  const isSuperAdmin = checkIsSuperAdmin(userEffectiveRole);
  const userCanDelete = canDeleteUser(userEffectiveRole);
  const userCanManageRoles = canManageRoles(userEffectiveRole);
  const userCanPromoteSuperAdmin = canPromoteToSuperAdmin(userEffectiveRole);
  const currentEmail = (currentUser?.email ?? "").toLowerCase();

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "team">("members");

  // Modals state for Tech Club Team
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<"super_admin" | "admin" | "coordinator">("coordinator");

  const [editRoleModal, setEditRoleModal] = useState<{
    isOpen: boolean;
    email: string;
    role: "super_admin" | "admin" | "coordinator";
  }>({ isOpen: false, email: "", role: "coordinator" });

  // Confirm Modal state for Website Members role changes (legacy fallback)
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; user: UserItem | null; newRole: string | null }>(
    { isOpen: false, user: null, newRole: null }
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Subscribe to Website Members (users collection)
  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = userService.subscribeUsers(
      (users) => {
        setUsersList(users);
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to users:", err);
        setError("Missing or insufficient permissions to read users.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to Tech Club Team (team_access collection)
  useEffect(() => {
    setTeamLoading(true);
    setTeamError(null);
    const unsubTeam = teamAccessService.subscribeAllTeamAccess(
      (members) => {
        setTeamMembers(members);
        setTeamLoading(false);
      },
      (err) => {
        console.error("Error subscribing to team members:", err);
        setTeamError("Unable to load team list. Please update Firestore rules and redeploy.");
        setTeamLoading(false);
      }
    );
    return () => unsubTeam();
  }, []);

  // Filter Website Members
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      (u.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter Tech Club Team Members
  const filteredTeamMembers = teamMembers.filter((tm) => {
    const matchesSearch =
      (tm.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tm.role ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleToggleBlock = async (id: string) => {
    const user = usersList.find((u) => u.id === id);
    if (!user) return;
    const nextStatus = user.status === "Blocked" ? "Active" : "Blocked";
    await userService.updateUserStatus(id, nextStatus);
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (!userCanDelete) {
      alert("Forbidden: Only a Super Admin can delete user accounts.");
      return;
    }
    if ((email ?? "").toLowerCase() === currentEmail) {
      alert("You cannot delete your own account.");
      return;
    }
    if (confirm(`Permanently delete user account (${email})? This removes them from Firestore and Firebase Auth.`)) {
      try {
        const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : undefined;
        await userService.deleteUser(id, email, idToken);
      } catch (err) {
        alert("Delete failed: " + (err as Error).message);
      }
    }
  };

  const handleGrantAccess = async () => {
    const { user, newRole } = confirmModal;
    if (!user || !newRole) return;
    if (newRole === "super_admin" && !userCanPromoteSuperAdmin) {
      alert("Forbidden: Only an existing Super Admin can promote another user to Super Admin.");
      setConfirmModal({ isOpen: false, user: null, newRole: null });
      return;
    }
    try {
      console.log(`[Admin Flow] Changing role to ${newRole} for ${user.email}`);
      
      // 1. Authoritative access provisioning/revocation
      if (newRole === "member") {
        await teamAccessService.removeTeamAccess(user.email, user.id);
        console.log(`[Admin Flow] team_access document removed successfully (demoted to member).`);
      } else {
        await teamAccessService.addOrUpdateTeamAccess(user.email, newRole as "super_admin" | "admin" | "coordinator", user.id);
        console.log(`[Admin Flow] team_access document created/updated successfully.`);
      }
      
      // 2. Legacy UI consistency (so the members table reflects the change)
      if (user.id) {
        await userService.updateUserRole(user.id, newRole);
      }
      console.log(`[Admin Flow] users document role updated.`);
    } catch (err) {
      console.error("[Admin Flow] Error granting access:", err);
      alert("Failed to grant access: " + (err as Error).message);
    } finally {
      setConfirmModal({ isOpen: false, user: null, newRole: null });
    }
  };

  // Actions for Tech Club Team Members
  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = addEmail.trim();
    if (!targetEmail) return;
    if (addRole === "super_admin" && !userCanPromoteSuperAdmin) {
      alert("Forbidden: Only an existing Super Admin can assign the Super Admin role.");
      return;
    }
    try {
      const matchingUser = usersList.find((u) => u.email.toLowerCase() === targetEmail.toLowerCase());
      await teamAccessService.addOrUpdateTeamAccess(targetEmail, addRole, matchingUser?.id);
      if (matchingUser) {
        await userService.updateUserRole(matchingUser.id, addRole);
      }
      setIsAddModalOpen(false);
      setAddEmail("");
      setAddRole("coordinator");
    } catch (err) {
      alert("Failed to add team member: " + (err as Error).message);
    }
  };

  const handleEditTeamRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editRoleModal.role === "super_admin" && !userCanPromoteSuperAdmin) {
      alert("Forbidden: Only an existing Super Admin can assign the Super Admin role.");
      return;
    }
    try {
      const matchingUser = usersList.find((u) => u.email.toLowerCase() === editRoleModal.email.toLowerCase());
      await teamAccessService.updateRole(editRoleModal.email, editRoleModal.role, matchingUser?.id);
      if (matchingUser) {
        await userService.updateUserRole(matchingUser.id, editRoleModal.role);
      }
      setEditRoleModal({ isOpen: false, email: "", role: "coordinator" });
    } catch (err) {
      alert("Failed to update role: " + (err as Error).message);
    }
  };

  const handleToggleTeamStatus = async (email: string, currentStatus: "active" | "inactive") => {
    try {
      const nextStatus = currentStatus === "active" ? "inactive" : "active";
      await teamAccessService.updateStatus(email, nextStatus);
    } catch (err) {
      alert("Failed to change status: " + (err as Error).message);
    }
  };

  const handleRemoveTeamAccess = async (email: string) => {
    if ((email ?? "").toLowerCase() === currentEmail) {
      alert("You cannot remove your own team access. Ask another super admin to do this.");
      return;
    }
    if (confirm(`Permanently remove admin access for ${email}?`)) {
      try {
        await teamAccessService.removeTeamAccess(email);
      } catch (err) {
        alert("Failed to remove team member: " + (err as Error).message);
      }
    }
  };

  // Formatting Timestamp helper
  const formatTimestamp = (ts: any) => {
    if (!ts) return "N/A";
    if (typeof ts.toDate === "function") {
      return ts.toDate().toLocaleDateString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString();
    }
    return new Date(ts).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-indigo-600">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center space-y-2">
        <h4 className="font-bold text-sm">Firestore Permission Error</h4>
        <p className="text-xs">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Members & Team Governance
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage website members, club team, and role-based privileges.
          </p>
        </div>
        {activeTab === "team" && isSuperAdmin && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Team Member
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200/60 dark:border-gray-800 pb-2">
        <button
          onClick={() => {
            setActiveTab("members");
            setSearchQuery("");
          }}
          className={cn(
            "px-4 py-2 text-sm font-bold rounded-t-xl transition-colors cursor-pointer",
            activeTab === "members" 
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Website Members
        </button>
        <button
          onClick={() => {
            setActiveTab("team");
            setSearchQuery("");
          }}
          className={cn(
            "px-4 py-2 text-sm font-bold rounded-t-xl transition-colors cursor-pointer",
            activeTab === "team" 
              ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20" 
              : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          )}
        >
          Tech Club Team
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === "members" ? "Filter members by name, email or department..." : "Filter team by email or role..."}
          className="w-full pl-10 pr-4 py-2 text-xs md:text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* View Switcher */}
      {activeTab === "members" ? (
        /* Website Members Table */
        <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Department & Year</th>
                  <th className="p-4">Events Attended</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Account Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No members found matching your search.
                    </td>
                  </tr>
                )}
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                    <td className="p-4 font-bold text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                        <div>
                          <p className="font-bold">{u.name}</p>
                          <p className="text-[11px] text-gray-400 font-normal">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        u.role === "super_admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" :
                        u.role === "admin" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
                        u.role === "coordinator" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" :
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      )}>
                        {u.role || "member"}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {u.department || u.year ? (
                        <>
                          {u.department && <p className="font-semibold text-xs">{u.department}</p>}
                          {u.year && <p className="text-[10px] text-gray-400">{u.year}</p>}
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-blue-600 dark:text-blue-400">
                      {u.eventsAttended || 0} Events
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                          u.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : u.status === "Blocked"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {u.status || "Active"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {userCanManageRoles && (
                          <div className="relative group/dropdown">
                            <button className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 transition-colors">
                              Grant Admin Access
                            </button>
                            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg opacity-0 invisible group-hover/dropdown:opacity-100 group-hover/dropdown:visible transition-all z-10 flex flex-col overflow-hidden">
                              {userCanPromoteSuperAdmin && (
                                <button
                                  onClick={() => setConfirmModal({ isOpen: true, user: u, newRole: "super_admin" })}
                                  className="px-4 py-2 text-left text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                                >
                                  Super Admin
                                </button>
                              )}
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, user: u, newRole: "coordinator" })}
                                className="px-4 py-2 text-left text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                              >
                                Coordinator
                              </button>
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, user: u, newRole: "admin" })}
                                className="px-4 py-2 text-left text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                              >
                                Admin
                              </button>
                              <button
                                onClick={() => setConfirmModal({ isOpen: true, user: u, newRole: "member" })}
                                className="px-4 py-2 text-left text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer text-red-600 dark:text-red-400 border-t border-gray-100 dark:border-gray-700"
                              >
                                Revoke (Make Member)
                              </button>
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => onOpenProfileModal(u)}
                          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleToggleBlock(u.id)}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors cursor-pointer",
                            u.status === "Blocked"
                              ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          )}
                          title={u.status === "Blocked" ? "Unblock User" : "Block User"}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                        {userCanDelete && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={(u.email ?? "").toLowerCase() === currentEmail}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              (u.email ?? "").toLowerCase() === currentEmail
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            )}
                            title={(u.email ?? "").toLowerCase() === currentEmail ? "Cannot delete your own account" : "Delete User"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tech Club Team Table */
        <div className="glass-card rounded-3xl border border-gray-200/60 dark:border-gray-800/60 overflow-hidden animate-in fade-in duration-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs md:text-sm">
              <thead className="bg-gray-50/80 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200/60 dark:border-gray-800/60">
                <tr>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Created</th>
                  {isSuperAdmin && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {teamLoading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 5 : 4} className="p-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-indigo-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500" />
                        <span className="text-xs font-medium">Loading team members…</span>
                      </div>
                    </td>
                  </tr>
                ) : teamError ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 5 : 4} className="p-6">
                      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs space-y-1">
                        <p className="font-bold">⚠ Firestore Permission Error</p>
                        <p>{teamError}</p>
                        <p className="text-[10px] text-red-400 mt-1">Go to <strong>Firebase Console → Firestore → Rules</strong> and change <code>allow list: if isAdmin();</code> to <code>allow list: if isAuthenticated();</code> in the team_access section.</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTeamMembers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 5 : 4} className="p-8 text-center text-gray-500 text-xs">
                      {searchQuery ? "No team members matching the search." : "No team members in team_access collection yet. Add one using the button above."}
                    </td>
                  </tr>
                ) : null}
                {filteredTeamMembers.map((tm) => (
                  <tr key={tm.email} className="hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors">
                    <td className="p-4 font-semibold text-gray-900 dark:text-white">
                      {tm.email}
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                        tm.role === "super_admin" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" :
                        tm.role === "admin" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
                        "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
                      )}>
                        {tm.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-bold border",
                          tm.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        )}
                      >
                        {tm.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">
                      {formatTimestamp(tm.createdAt)}
                    </td>
                    {isSuperAdmin && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditRoleModal({ isOpen: true, email: tm.email, role: tm.role })}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleTeamStatus(tm.email, tm.status)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors cursor-pointer",
                              tm.status === "inactive"
                                ? "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                : "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            )}
                            title={tm.status === "inactive" ? "Activate" : "Deactivate"}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveTeamAccess(tm.email)}
                            disabled={(tm.email ?? "").toLowerCase() === currentEmail}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              (tm.email ?? "").toLowerCase() === currentEmail
                                ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                : "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            )}
                            title={(tm.email ?? "").toLowerCase() === currentEmail ? "Cannot remove your own access" : "Remove Access"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Role Changes (Website Members) */}
      {confirmModal.isOpen && confirmModal.user && confirmModal.newRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-4 mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              {confirmModal.newRole === "member" ? "Revoke Admin Access?" : `Promote to ${confirmModal.newRole}?`}
            </h3>
            
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 my-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">User:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{confirmModal.user.name}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                <span className="text-gray-500">New Role:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 capitalize">{confirmModal.newRole}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ isOpen: false, user: null, newRole: null })}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleGrantAccess}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Add Team Member
            </h3>
            <form onSubmit={handleAddTeamMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Role
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold"
                >
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setAddEmail("");
                    setAddRole("coordinator");
                  }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editRoleModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Edit Team Role
            </h3>
            <p className="text-xs text-gray-400 mb-4 truncate">{editRoleModal.email}</p>
            <form onSubmit={handleEditTeamRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase">
                  Role
                </label>
                <select
                  value={editRoleModal.role || "coordinator"}
                  onChange={(e) => setEditRoleModal({ ...editRoleModal, role: e.target.value as any })}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/50 font-semibold"
                >
                  <option value="coordinator">Coordinator</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditRoleModal({ isOpen: false, email: "", role: "coordinator" })}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
