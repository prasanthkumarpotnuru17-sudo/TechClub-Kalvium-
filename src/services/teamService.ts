import { 
  collection, doc, getDocs, getDoc, deleteDoc, onSnapshot, query 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { safeSetDoc, safeUpdateDoc } from "@/lib/firestoreUtils";
import { TeamMemberItem } from "@/lib/services/mockData";
import { logActivity } from "./activityLogService";

const TEAMS_COLLECTION = "teams";

// Mappings from Admin roleGroup to landing page category
const roleGroupToCategory: Record<string, string> = {
  "Faculty Coordinators": "faculty",
  "Core Team": "core",
  "Student Leads": "lead",
  "Volunteers": "volunteer",
};

const categoryToRoleGroup: Record<string, string> = {
  "faculty": "Faculty Coordinators",
  "core": "Core Team",
  "lead": "Student Leads",
  "volunteer": "Volunteers",
};

const roleGroupToBg: Record<string, string> = {
  "Faculty Coordinators": "from-blue-600 to-cyan-500",
  "Core Team": "from-gray-900 to-slate-800",
  "Student Leads": "from-pink-500 to-rose-400",
  "Volunteers": "from-emerald-500 to-teal-500",
};

export const DEFAULT_REAL_TEAM = [
  {
    id: "head-1",
    name: "Prasanth Kumar Potnuru",
    roleGroup: "Core Team",
    designation: "Head of Tech Club & Lead Architect",
    role: "Head of Tech Club",
    category: "core",
    avatarInitials: "PK",
    avatarBg: "from-blue-600 to-indigo-600",
    bio: "Head of Tech Club directing software architecture, technical cohorts and student project incubation.",
    email: "prasanthkumarpotnuru17@gmail.com",
    github: "https://github.com",
    linkedin: "https://linkedin.com",
  },
];

export const teamService = {
  // Subscribe to all team members in real-time
  subscribeTeam(callback: (members: any[]) => void): () => void {
    const q = query(collection(db, TEAMS_COLLECTION));
    return onSnapshot(q, (snapshot) => {
      const dbMembers: any[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const name = (data.name || "").trim();
        // Ignore test/junk entries like 'rfghjk' or empty names
        if (!name || name.toLowerCase().includes("rfghjk") || name.length < 3) return;

        const initials = name
          ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
          : "TM";
          
        const group = data.roleGroup || "Core Team";
        const cat = roleGroupToCategory[group] || "core";
        const bg = roleGroupToBg[group] || "from-gray-900 to-slate-800";

        dbMembers.push({
          id: docSnap.id,
          name,
          roleGroup: group,
          designation: data.designation || data.role || "",
          role: data.designation || data.role || "",
          category: cat,
          avatarInitials: initials,
          avatarBg: bg,
          bio: data.bio || data.designation || "Tech Club Leader",
          email: data.email || "",
          phone: data.phone || "",
          department: data.department || "",
          avatar: data.avatar || "",
          github: data.github || "",
          linkedin: data.linkedin || "https://linkedin.com",
          ...data
        });
      });

      // Combine real Firestore team members with default real heads if not present
      const existingEmails = new Set(dbMembers.map(m => (m.email || "").toLowerCase()));
      const defaultsToAdd = DEFAULT_REAL_TEAM.filter(d => !existingEmails.has(d.email.toLowerCase()));

      const combined = [...dbMembers, ...defaultsToAdd];
      callback(combined);
    }, (error) => {
      console.error("Error subscribing to teams:", error);
      callback(DEFAULT_REAL_TEAM);
    });
  },

  // Get list once
  async getTeam(): Promise<any[]> {
    const snap = await getDocs(collection(db, TEAMS_COLLECTION));
    const members: any[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const initials = data.name
        ? data.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
        : "TM";
        
      const group = data.roleGroup || "Core Team";
      const cat = roleGroupToCategory[group] || "core";
      const bg = roleGroupToBg[group] || "from-gray-900 to-slate-800";

      members.push({
        id: docSnap.id,
        name: data.name || "",
        roleGroup: group,
        designation: data.designation || data.role || "",
        role: data.designation || data.role || "",
        category: cat,
        avatarInitials: initials,
        avatarBg: bg,
        bio: data.bio || data.designation || "Tech Club Leader",
        email: data.email || "",
        phone: data.phone || "",
        department: data.department || "",
        avatar: data.avatar || "",
        github: data.github || "",
        linkedin: data.linkedin || "https://linkedin.com",
        ...data
      });
    });
    return members;
  },

  // Add member
  async addTeamMember(member: Omit<TeamMemberItem, "id"> & { bio?: string }): Promise<TeamMemberItem> {
    const id = `tm-${Date.now()}`;
    const newMember = {
      ...member,
      id,
      bio: member.bio || member.designation || "Tech Club Leader",
    };
    await safeSetDoc(doc(db, TEAMS_COLLECTION, id), newMember);
    await logActivity("user", "System Admin", `Added Team Member: ${member.name}`);
    return newMember;
  },

  // Edit member
  async updateTeamMember(id: string, updates: Partial<TeamMemberItem & { bio?: string }>): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, id);
    await safeUpdateDoc(docRef, updates);
  },

  // Delete member
  async deleteTeamMember(id: string): Promise<void> {
    const docRef = doc(db, TEAMS_COLLECTION, id);
    const snap = await getDoc(docRef);
    const name = snap.exists() ? (snap.data() as TeamMemberItem).name : id;
    await deleteDoc(docRef);
    await logActivity("user", "System Admin", `Removed Team Member: ${name}`);
  }
};
