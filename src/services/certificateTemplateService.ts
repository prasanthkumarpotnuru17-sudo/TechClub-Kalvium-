import { 
  collection, doc, getDoc, getDocs, onSnapshot, query, setDoc, deleteDoc, updateDoc, serverTimestamp, increment 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const TEMPLATES_COLLECTION = "certificate_templates";
const CERTIFICATES_COLLECTION = "certificates";

export type TemplateCategory =
  | "Completion"
  | "Participation"
  | "Winner"
  | "Runner Up"
  | "Volunteer"
  | "Speaker"
  | "Organizer";

export type TemplateStatus = "Draft" | "Published" | "Archived";

export type ElementType = "text" | "placeholder" | "image" | "shape";

export type ShapeType = "rectangle" | "circle" | "line";

export interface ElementStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  fontStyle?: "normal" | "italic";
  fontColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
  uppercase?: boolean;
  textAlign?: "left" | "center" | "right";
  
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;

  opacity?: number;
  rotation?: number;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  label: string;
  
  // Normalized 0-100% position & dimensions
  x: number;
  y: number;
  width?: number;
  height?: number;
  zIndex: number;

  // Interactivity Flags
  isLocked?: boolean;
  isHidden?: boolean;

  // Content & Styling
  placeholderKey?: string;
  shapeType?: ShapeType;
  content?: string;
  url?: string;

  styles: ElementStyle;
}

export interface CanvasSettings {
  paperSize: "A4" | "Letter";
  orientation: "landscape" | "portrait";
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundOpacity: number;
  showSafeArea: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface TemplateAssetMetadata {
  storagePath?: string;
  downloadUrl: string;
  width?: number;
  height?: number;
}

export interface TemplateAssets {
  background?: TemplateAssetMetadata;
  logo?: TemplateAssetMetadata;
  signature?: TemplateAssetMetadata;
  seal?: TemplateAssetMetadata;
}

export interface CertificateTemplate {
  id: string;

  name: string;
  description?: string;

  status: TemplateStatus;
  version: number;
  category: TemplateCategory;
  isDefault: boolean;

  canvas: CanvasSettings;
  elements: CanvasElement[];

  assets: TemplateAssets;

  previewData?: Record<string, string>;

  createdBy: string;
  updatedBy?: string;
  createdAt?: any;
  updatedAt?: any;
  lastPublishedAt?: any;

  usageCount?: number;
  lastUsedAt?: any;

  isDeleted?: boolean;
  deletedAt?: any;
  deletedBy?: string;
  parentTemplateId?: string | null;
}

export interface TemplateHealthResult {
  score: number;
  totalRules: number;
  percentage: number;
  isReadyToPublish: boolean;
  rules: {
    hasName: boolean;
    hasBackground: boolean;
    hasParticipantName: boolean;
    hasEventName: boolean;
    hasCertNumber: boolean;
    hasIssueDate: boolean;
  };
  missingItems: string[];
}

export const DEFAULT_SYSTEM_TEMPLATES: CertificateTemplate[] = [
  {
    id: "tpl-default-official",
    name: "Official Excellence Certificate",
    description: "Standard official certificate for events, workshops, and hackathons.",
    status: "Published",
    version: 1,
    category: "Completion",
    isDefault: true,
    canvas: {
      paperSize: "A4",
      orientation: "landscape",
      backgroundColor: "#FFFFFF",
      backgroundImageUrl: "",
      backgroundOpacity: 1,
      showSafeArea: true,
      showGrid: false,
      snapToGrid: true,
    },
    elements: [
      {
        id: "el-title",
        type: "text",
        label: "Certificate Title",
        content: "CERTIFICATE OF ACHIEVEMENT",
        x: 50,
        y: 22,
        zIndex: 10,
        styles: {
          fontFamily: "Inter",
          fontSize: 26,
          fontWeight: "extrabold",
          fontColor: "#D97706",
          textAlign: "center",
          letterSpacing: 2,
        },
      },
      {
        id: "el-subhead",
        type: "text",
        label: "Subheading",
        content: "PROUDLY PRESENTED TO",
        x: 50,
        y: 34,
        zIndex: 9,
        styles: {
          fontFamily: "Inter",
          fontSize: 12,
          fontWeight: "semibold",
          fontColor: "#64748B",
          textAlign: "center",
          letterSpacing: 1.5,
        },
      },
      {
        id: "el-participant-name",
        type: "placeholder",
        placeholderKey: "participant_name",
        label: "Participant Name",
        x: 50,
        y: 46,
        zIndex: 11,
        styles: {
          fontFamily: "Inter",
          fontSize: 32,
          fontWeight: "extrabold",
          fontColor: "#0F172A",
          textAlign: "center",
        },
      },
      {
        id: "el-for-completion",
        type: "text",
        label: "Description",
        content: "for successful participation and outstanding achievement in",
        x: 50,
        y: 56,
        zIndex: 8,
        styles: {
          fontFamily: "Inter",
          fontSize: 13,
          fontColor: "#475569",
          textAlign: "center",
        },
      },
      {
        id: "el-event-name",
        type: "placeholder",
        placeholderKey: "event_name",
        label: "Event Name",
        x: 50,
        y: 65,
        zIndex: 12,
        styles: {
          fontFamily: "Inter",
          fontSize: 20,
          fontWeight: "bold",
          fontColor: "#D97706",
          textAlign: "center",
        },
      },
      {
        id: "el-divider",
        type: "shape",
        shapeType: "line",
        label: "Golden Accent Line",
        x: 50,
        y: 73,
        width: 50,
        height: 1,
        zIndex: 5,
        styles: {
          borderColor: "#F59E0B",
          borderWidth: 2,
          opacity: 0.8,
        },
      },
      {
        id: "el-issue-date",
        type: "placeholder",
        placeholderKey: "issue_date",
        label: "Issue Date",
        x: 22,
        y: 84,
        zIndex: 7,
        styles: {
          fontFamily: "Inter",
          fontSize: 12,
          fontColor: "#64748B",
          textAlign: "left",
        },
      },
      {
        id: "el-cert-number",
        type: "placeholder",
        placeholderKey: "certificate_number",
        label: "Certificate Number",
        x: 78,
        y: 84,
        zIndex: 6,
        styles: {
          fontFamily: "Inter",
          fontSize: 12,
          fontColor: "#64748B",
          textAlign: "right",
        },
      },
    ],
    assets: {},
    createdBy: "system",
    usageCount: 0,
  },
];

export const certificateTemplateService = {
  // ── Template Health & Pre-Publish Validation ───────────────────────
  checkTemplateHealth(template: Partial<CertificateTemplate>): TemplateHealthResult {
    const name = template.name?.trim() || "";
    const hasName = name.length > 0;

    const bgUrl = template.canvas?.backgroundImageUrl || template.assets?.background?.downloadUrl || "";
    const hasBackground = bgUrl.trim().length > 0;

    const elements = template.elements || [];
    const placeholders = elements.filter((el) => el.type === "placeholder").map((el) => el.placeholderKey);

    const hasParticipantName = placeholders.includes("participant_name");
    const hasEventName = placeholders.includes("event_name");
    const hasCertNumber = placeholders.includes("certificate_number");
    const hasIssueDate = placeholders.includes("issue_date");

    const rules = {
      hasName,
      hasBackground,
      hasParticipantName,
      hasEventName,
      hasCertNumber,
      hasIssueDate,
    };

    const missingItems: string[] = [];
    if (!hasName) missingItems.push("Template Name is missing");
    if (!hasBackground) missingItems.push("Background canvas image is missing");
    if (!hasParticipantName) missingItems.push("{{participant_name}} placeholder element is missing");
    if (!hasEventName) missingItems.push("{{event_name}} placeholder element is missing");
    if (!hasCertNumber) missingItems.push("{{certificate_number}} placeholder element is missing");
    if (!hasIssueDate) missingItems.push("{{issue_date}} placeholder element is missing");

    const score = Object.values(rules).filter(Boolean).length;
    const totalRules = 6;
    const percentage = Math.round((score / totalRules) * 100);
    const isReadyToPublish = score === totalRules;

    return {
      score,
      totalRules,
      percentage,
      isReadyToPublish,
      rules,
      missingItems,
    };
  },

  // ── Basic Name Validation ──────────────────────────────────────
  validateTemplate(
    templateData: Partial<CertificateTemplate>, 
    existingTemplates: CertificateTemplate[] = [],
    currentId?: string
  ): void {
    const templateName = templateData.name?.trim();
    if (!templateName) {
      throw new Error("Template Name is required.");
    }
    const isDuplicateName = existingTemplates.some(
      (t) => t.id !== currentId && 
             t.name?.toLowerCase().trim() === templateName.toLowerCase() && 
             !t.isDeleted
    );
    if (isDuplicateName) {
      throw new Error(`A template named "${templateName}" already exists.`);
    }
  },

  // ── Real-time Listener ──────────────────────────────────────────
  subscribeTemplates(
    callback: (templates: CertificateTemplate[]) => void, 
    onError?: (error: any) => void
  ): () => void {
    console.log("[certificateTemplateService] Subscribing to certificate_templates...");
    const q = query(collection(db, TEMPLATES_COLLECTION));
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          console.log("[certificateTemplateService] No templates in Firestore, seeding default template...");
          setDoc(doc(db, TEMPLATES_COLLECTION, DEFAULT_SYSTEM_TEMPLATES[0].id), DEFAULT_SYSTEM_TEMPLATES[0]).catch(err => {
            console.error("[certificateTemplateService] Error seeding default template:", err);
          });
          callback(DEFAULT_SYSTEM_TEMPLATES);
          return;
        }

        const templates: CertificateTemplate[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          // Unify schema fallback for legacy docs if present
          const name = data.name || data.metadata?.name || "Untitled Template";
          const category = data.category || data.metadata?.category || "Completion";
          const status = data.status || data.metadata?.status || "Draft";
          const version = data.version || data.metadata?.version || 1;
          const isDefault = !!(data.isDefault || data.metadata?.isDefault);

          templates.push({
            ...data,
            id: docSnap.id,
            name,
            category,
            status,
            version,
            isDefault,
            canvas: data.canvas || {
              paperSize: "A4",
              orientation: "landscape",
              backgroundColor: "#FFFFFF",
              backgroundImageUrl: data.background?.url || "",
              backgroundOpacity: 1,
              showSafeArea: true,
              showGrid: false,
              snapToGrid: true,
            },
            elements: data.elements || [],
            assets: data.assets || {
              background: data.background ? { downloadUrl: data.background.url || "" } : undefined,
              logo: data.logoUrl ? { downloadUrl: data.logoUrl } : undefined,
              signature: data.signatureUrl ? { downloadUrl: data.signatureUrl } : undefined,
              seal: data.sealUrl ? { downloadUrl: data.sealUrl } : undefined,
            },
            usageCount: data.usageCount || 0,
          });
        });
        callback(templates);
      },
      (error) => {
        console.error("[certificateTemplateService] Error subscribing:", error);
        if (onError) onError(error);
        else callback(DEFAULT_SYSTEM_TEMPLATES);
      }
    );
  },

  // ── Get Single Template ─────────────────────────────────────────
  async getTemplate(id: string): Promise<CertificateTemplate | null> {
    const docRef = doc(db, TEMPLATES_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    
    const data = snap.data() as any;
    return {
      ...data,
      id: snap.id,
      name: data.name || data.metadata?.name || "Untitled Template",
      category: data.category || data.metadata?.category || "Completion",
      status: data.status || data.metadata?.status || "Draft",
      version: data.version || data.metadata?.version || 1,
      isDefault: !!(data.isDefault || data.metadata?.isDefault),
    };
  },

  // ── Fetch All Templates ─────────────────────────────────────────
  async getTemplates(): Promise<CertificateTemplate[]> {
    const snap = await getDocs(collection(db, TEMPLATES_COLLECTION));
    const templates: CertificateTemplate[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      templates.push({
        ...data,
        id: docSnap.id,
        name: data.name || data.metadata?.name || "Untitled Template",
        category: data.category || data.metadata?.category || "Completion",
        status: data.status || data.metadata?.status || "Draft",
        version: data.version || data.metadata?.version || 1,
        isDefault: !!(data.isDefault || data.metadata?.isDefault),
      });
    });
    return templates;
  },

  // ── Unset Default Rule ──────────────────────────────────────────
  async unsetExistingDefaults(): Promise<void> {
    const snap = await getDocs(collection(db, TEMPLATES_COLLECTION));
    const updates: Promise<void>[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isDefault || data.metadata?.isDefault) {
        updates.push(
          updateDoc(doc(db, TEMPLATES_COLLECTION, docSnap.id), { 
            isDefault: false,
          })
        );
      }
    });
    await Promise.all(updates);
  },

  // ── Set Default Template ────────────────────────────────────────
  async setDefaultTemplate(id: string): Promise<void> {
    await this.unsetExistingDefaults();
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), { 
      isDefault: true,
      updatedAt: serverTimestamp() 
    });
  },

  // ── Create Template ─────────────────────────────────────────────
  async createTemplate(
    templateData: Partial<CertificateTemplate>,
    userId: string = "admin"
  ): Promise<CertificateTemplate> {
    const existing = await this.getTemplates();
    this.validateTemplate(templateData, existing);

    const isDefault = !!templateData.isDefault;
    if (isDefault) {
      await this.unsetExistingDefaults();
    }

    const id = templateData.id || `tpl-${Date.now()}`;
    const name = templateData.name?.trim() || "Untitled Template";
    const status: TemplateStatus = templateData.status || "Draft";
    const category: TemplateCategory = templateData.category || "Completion";
    const version = templateData.version || 1;

    const newTemplate: CertificateTemplate = {
      id,
      name,
      description: templateData.description || "",
      status,
      category,
      version,
      isDefault,
      canvas: templateData.canvas || {
        paperSize: "A4",
        orientation: "landscape",
        backgroundColor: "#FFFFFF",
        backgroundImageUrl: templateData.assets?.background?.downloadUrl || "",
        backgroundOpacity: 1,
        showSafeArea: true,
        showGrid: false,
        snapToGrid: true,
      },
      elements: templateData.elements || [],
      assets: templateData.assets || {},
      previewData: templateData.previewData || {},
      usageCount: 0,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    console.log("[certificateTemplateService] Creating template in Firestore:", id);
    await setDoc(doc(db, TEMPLATES_COLLECTION, id), newTemplate);
    return newTemplate;
  },

  // ── Update Template ─────────────────────────────────────────────
  async updateTemplate(
    id: string,
    updates: Partial<CertificateTemplate>,
    userId: string = "admin"
  ): Promise<void> {
    const existing = await this.getTemplates();
    this.validateTemplate(updates, existing, id);

    const isDefault = !!updates.isDefault;
    if (isDefault) {
      await this.unsetExistingDefaults();
    }

    const currentDoc = existing.find((t) => t.id === id);
    let nextVersion = currentDoc ? (currentDoc.version || 1) : 1;
    if (currentDoc && currentDoc.status === "Published" && updates.status !== "Archived") {
      nextVersion += 1;
    }

    const cleanUpdates: Record<string, any> = {
      ...updates,
      name: updates.name || currentDoc?.name || "Untitled Template",
      category: updates.category || currentDoc?.category || "Completion",
      status: updates.status || currentDoc?.status || "Draft",
      version: nextVersion,
      isDefault,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    };

    // Clean up any legacy nested metadata fields if present to enforce single source of truth
    delete cleanUpdates.metadata;

    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), cleanUpdates);
  },

  // ── Publish Template (With Health Check) ────────────────────────
  async publishTemplate(id: string, userId: string = "admin"): Promise<void> {
    const tpl = await this.getTemplate(id);
    if (!tpl) throw new Error("Template not found.");

    const health = this.checkTemplateHealth(tpl);
    if (!health.isReadyToPublish) {
      throw new Error(`Cannot publish template. Missing required items:\n- ${health.missingItems.join("\n- ")}`);
    }

    let nextVersion = tpl.version || 1;
    if (tpl.status === "Published") {
      nextVersion += 1;
    }

    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), {
      status: "Published",
      version: nextVersion,
      lastPublishedAt: serverTimestamp(),
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  },

  // ── Unpublish Template ──────────────────────────────────────────
  async unpublishTemplate(id: string, userId: string = "admin"): Promise<void> {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), {
      status: "Draft",
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  },

  // ── Archive Template ────────────────────────────────────────────
  async archiveTemplate(id: string, userId: string = "admin"): Promise<void> {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), {
      status: "Archived",
      isDeleted: true,
      deletedBy: userId,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // ── Restore Template ───────────────────────────────────────────
  async restoreTemplate(id: string, userId: string = "admin"): Promise<void> {
    await updateDoc(doc(db, TEMPLATES_COLLECTION, id), {
      status: "Draft",
      isDeleted: false,
      updatedBy: userId,
      updatedAt: serverTimestamp(),
    });
  },

  // ── Delete Template (Protection Check) ──────────────────────────
  async deleteTemplate(id: string): Promise<void> {
    const certsSnap = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    let inUse = false;
    certsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.templateId === id) {
        inUse = true;
      }
    });

    if (inUse) {
      throw new Error("Cannot delete template: It is referenced by existing issued certificates. Please archive it instead.");
    }

    await deleteDoc(doc(db, TEMPLATES_COLLECTION, id));
  },

  // ── Duplicate Template ──────────────────────────────────────────
  async duplicateTemplate(id: string, userId: string = "admin"): Promise<CertificateTemplate> {
    const original = await this.getTemplate(id);
    if (!original) throw new Error("Original template not found.");

    const newId = `tpl-${Date.now()}`;
    const duplicateName = `${original.name || "Template"} Copy 1`;

    const elementsToUse = (original.elements && original.elements.length > 0)
      ? original.elements
      : DEFAULT_SYSTEM_TEMPLATES[0].elements;

    const duplicated: CertificateTemplate = {
      ...original,
      id: newId,
      name: duplicateName,
      version: 1,
      elements: elementsToUse,
      parentTemplateId: original.id,
      isDefault: false,
      status: "Draft",
      usageCount: 0,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, TEMPLATES_COLLECTION, newId), duplicated);
    return duplicated;
  },

  // ── Usage Tracking Counter ──────────────────────────────────────
  async incrementTemplateUsage(templateId: string): Promise<void> {
    try {
      const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
      await updateDoc(docRef, {
        usageCount: increment(1),
        lastUsedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn(`[certificateTemplateService] Usage increment failed for ${templateId}:`, err);
    }
  },

  // ── Search & Filter Helper ──────────────────────────────────────
  searchTemplates(
    templates: CertificateTemplate[],
    searchQuery: string,
    categoryFilter?: string,
    statusFilter?: string
  ): CertificateTemplate[] {
    return templates.filter((tpl) => {
      const name = tpl.name || "";
      const desc = tpl.description || "";
      const cat = tpl.category || "Completion";
      const status = tpl.status || "Draft";

      const matchesSearch = 
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !categoryFilter || categoryFilter === "All" || cat === categoryFilter;
      const matchesStatus = !statusFilter || statusFilter === "All" || status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }
};
