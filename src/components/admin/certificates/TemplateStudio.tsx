"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Save,
  ArrowLeft,
  Eye,
  Type,
  ImageIcon,
  Square,
  Sliders,
  GripVertical,
  Lock,
  Unlock,
  Trash2,
  Send,
  Loader2,
  Sparkles,
  Wand2,
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import {
  CertificateTemplate,
  CanvasElement,
  CanvasSettings,
  ElementType,
  ShapeType,
  TemplateCategory,
  TemplateStatus,
  TemplateAssets,
  TemplateAssetMetadata,
  certificateService
} from "@/services/certificateService";
import { ValidationPanel } from "./components/ValidationPanel";
import { AssetUploader } from "./components/AssetUploader";
import { AIDesignerModal } from "./components/AIDesignerModal";
import { AIChatAssistant } from "./components/AIChatAssistant";
import { cn } from "@/lib/utils";

interface TemplateStudioProps {
  selectedTemplate: CertificateTemplate | null;
  onBackToLibrary: () => void;
  onSaveSuccess: () => void;
}

const DEFAULT_PREVIEW_DATA: Record<string, string> = {
  participant_name: "Prasanth Kumar",
  participantName: "Prasanth Kumar",
  event_name: "Full Stack Development Workshop",
  eventName: "Full Stack Development Workshop",
  issue_date: "07 Aug 2026",
  issueDate: "07 Aug 2026",
  certificate_number: "TC-2026-000123",
  certificateNumber: "TC-2026-000123",
  organizer: "Tech Club",
  organizerName: "Tech Club",
  department: "Computer Science & Engineering",
  verification_code: "VERIFIED-TC-2026-000123",
};

const DEFAULT_CANVA_ELEMENTS: CanvasElement[] = [
  {
    id: "el-participant-name",
    type: "placeholder",
    placeholderKey: "participant_name",
    label: "Participant Name",
    x: 50,
    y: 46,
    zIndex: 10,
    styles: {
      fontFamily: "Inter",
      fontSize: 32,
      fontWeight: "bold",
      fontColor: "#1E293B",
      textAlign: "center",
      letterSpacing: 0,
      lineHeight: 1.2,
      opacity: 1,
      rotation: 0,
    },
  },
  {
    id: "el-event-name",
    type: "placeholder",
    placeholderKey: "event_name",
    label: "Event Name",
    x: 50,
    y: 58,
    zIndex: 9,
    styles: {
      fontFamily: "Inter",
      fontSize: 18,
      fontWeight: "semibold",
      fontColor: "#D97706",
      textAlign: "center",
      opacity: 1,
      rotation: 0,
    },
  },
  {
    id: "el-divider",
    type: "shape",
    shapeType: "line",
    label: "Golden Accent Line",
    x: 50,
    y: 65,
    width: 60,
    height: 1,
    zIndex: 4,
    styles: {
      borderColor: "#F59E0B",
      borderWidth: 2,
      opacity: 0.8,
      rotation: 0,
    },
  },
  {
    id: "el-issue-date",
    type: "placeholder",
    placeholderKey: "issue_date",
    label: "Issue Date",
    x: 22,
    y: 82,
    zIndex: 8,
    styles: {
      fontFamily: "Inter",
      fontSize: 12,
      fontColor: "#64748B",
      textAlign: "left",
      opacity: 1,
    },
  },
  {
    id: "el-cert-number",
    type: "placeholder",
    placeholderKey: "certificate_number",
    label: "Certificate Number",
    x: 78,
    y: 82,
    zIndex: 7,
    styles: {
      fontFamily: "Inter",
      fontSize: 12,
      fontColor: "#64748B",
      textAlign: "right",
      opacity: 1,
    },
  },
];

export function TemplateStudio({ selectedTemplate, onBackToLibrary, onSaveSuccess }: TemplateStudioProps) {
  // Studio States
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");
  const [panelTab, setPanelTab] = useState<"elements" | "properties" | "canvas" | "assets" | "ai">("elements");
  const [showAIDesignerModal, setShowAIDesignerModal] = useState(false);

  const [metadataState, setMetadataState] = useState({
    name: selectedTemplate?.name || "",
    description: selectedTemplate?.description || "",
    category: (selectedTemplate?.category || "Completion") as TemplateCategory,
    status: (selectedTemplate?.status || "Draft") as TemplateStatus,
    isDefault: !!selectedTemplate?.isDefault,
    version: selectedTemplate?.version || 1,
  });

  const [canvasState, setCanvasState] = useState<CanvasSettings>({
    paperSize: selectedTemplate?.canvas?.paperSize || "A4",
    orientation: selectedTemplate?.canvas?.orientation || "landscape",
    backgroundColor: selectedTemplate?.canvas?.backgroundColor || "#FFFFFF",
    backgroundImageUrl: selectedTemplate?.canvas?.backgroundImageUrl || selectedTemplate?.assets?.background?.downloadUrl || "",
    backgroundOpacity: selectedTemplate?.canvas?.backgroundOpacity ?? 1,
    showSafeArea: selectedTemplate?.canvas?.showSafeArea ?? true,
    showGrid: selectedTemplate?.canvas?.showGrid ?? false,
    snapToGrid: selectedTemplate?.canvas?.snapToGrid ?? true,
  });

  const [assetsState, setAssetsState] = useState<TemplateAssets>(
    selectedTemplate?.assets || {
      background: selectedTemplate?.canvas?.backgroundImageUrl ? { downloadUrl: selectedTemplate.canvas.backgroundImageUrl } : undefined,
    }
  );

  const [elementsState, setElementsState] = useState<CanvasElement[]>(
    selectedTemplate?.elements && selectedTemplate.elements.length > 0
      ? selectedTemplate.elements
      : DEFAULT_CANVA_ELEMENTS
  );

  const [previewDataState, setPreviewDataState] = useState<Record<string, string>>(
    selectedTemplate?.previewData || DEFAULT_PREVIEW_DATA
  );

  // AI Layout Integration Handler
  const handleApplyAIDesign = (bgUrl: string, newElements: CanvasElement[], promptText: string) => {
    if (bgUrl) {
      setCanvasState((prev) => ({ ...prev, backgroundImageUrl: bgUrl }));
      setAssetsState((prev) => ({ ...prev, background: { downloadUrl: bgUrl } }));
    }
    setElementsState(newElements);
    if (!metadataState.name || metadataState.name === "Untitled Studio Design") {
      setMetadataState((prev) => ({ ...prev, name: promptText ? `AI — ${promptText.slice(0, 25)}...` : "AI Designed Template" }));
    }
    setPanelTab("ai");
    setToastMessage("✨ AI Certificate Layout applied successfully! Modify elements or refine via AI Assistant.");
  };

  // Selection & Drag State
  const [selectedElementId, setSelectedElementId] = useState<string | null>("el-participant-name");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLDivElement>(null);

  // Operation Feedback & Auto-Save State
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);

  // Background Auto-Save to Firestore every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (elementsState.length === 0 || editorMode === "preview") return;

      try {
        const templateDoc: Partial<CertificateTemplate> = {
          name: metadataState.name || "AI Workshop 2026 Certificate",
          description: metadataState.description,
          category: metadataState.category,
          status: "Draft",
          canvas: canvasState,
          elements: elementsState,
          assets: assetsState,
          previewData: previewDataState,
        };

        if (selectedTemplate?.id) {
          await certificateService.updateTemplate(selectedTemplate.id, templateDoc);
        } else {
          await certificateService.createTemplate(templateDoc);
        }

        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        setLastAutoSaveTime(timeStr);
      } catch (err) {
        console.warn("[TemplateStudio] Background auto-save notice:", err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [elementsState, canvasState, metadataState, selectedTemplate, editorMode]);

  // Health Check
  const currentTemplateDoc: Partial<CertificateTemplate> = {
    name: metadataState.name,
    canvas: canvasState,
    elements: elementsState,
    assets: assetsState,
    status: metadataState.status,
  };

  const health = certificateService.checkTemplateHealth(currentTemplateDoc);

  // Drag Movement
  const handleStartDrag = (id: string, e: React.MouseEvent | React.TouchEvent) => {
    if (editorMode === "preview") return;
    const el = elementsState.find((item) => item.id === id);
    if (el?.isLocked) return;
    e.stopPropagation();
    setActiveDragId(id);
    setSelectedElementId(id);
    setPanelTab("properties");
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!activeDragId || !previewCanvasRef.current || editorMode === "preview") return;
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    let xPercent = Math.round(((clientX - rect.left) / rect.width) * 100);
    let yPercent = Math.round(((clientY - rect.top) / rect.height) * 100);

    if (canvasState.snapToGrid) {
      xPercent = Math.round(xPercent / 5) * 5;
      yPercent = Math.round(yPercent / 5) * 5;
    }

    xPercent = Math.max(0, Math.min(100, xPercent));
    yPercent = Math.max(0, Math.min(100, yPercent));

    setElementsState((prev: CanvasElement[]) =>
      prev.map((item) => (item.id === activeDragId ? { ...item, x: xPercent, y: yPercent } : item))
    );
  };

  useEffect(() => {
    const handleMouseUp = () => setActiveDragId(null);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, []);

  // Handlers for adding elements
  const handleAddTextElement = () => {
    const newEl: CanvasElement = {
      id: `el-text-${Date.now()}`,
      type: "text",
      label: "Custom Heading",
      x: 50,
      y: 50,
      zIndex: elementsState.length + 1,
      content: "Certificate Heading",
      styles: {
        fontFamily: "Inter",
        fontSize: 20,
        fontWeight: "semibold",
        fontColor: "#1E293B",
        textAlign: "center",
        opacity: 1,
        rotation: 0,
      },
    };
    setElementsState([...elementsState, newEl]);
    setSelectedElementId(newEl.id);
    setPanelTab("properties");
  };

  const handleAddPlaceholderElement = (key: string, label: string) => {
    const newEl: CanvasElement = {
      id: `el-ph-${Date.now()}`,
      type: "placeholder",
      placeholderKey: key,
      label,
      x: 50,
      y: 50,
      zIndex: elementsState.length + 1,
      styles: {
        fontFamily: "Inter",
        fontSize: 18,
        fontWeight: "medium",
        fontColor: "#334155",
        textAlign: "center",
        opacity: 1,
        rotation: 0,
      },
    };
    setElementsState([...elementsState, newEl]);
    setSelectedElementId(newEl.id);
    setPanelTab("properties");
  };

  const handleAddShapeElement = (shapeType: ShapeType, label: string) => {
    const newEl: CanvasElement = {
      id: `el-shape-${Date.now()}`,
      type: "shape",
      shapeType,
      label,
      x: 50,
      y: 50,
      width: shapeType === "line" ? 40 : 20,
      height: shapeType === "line" ? 1 : 15,
      zIndex: elementsState.length + 1,
      styles: {
        fillColor: shapeType === "line" ? "transparent" : "#F59E0B",
        borderColor: "#D97706",
        borderWidth: 2,
        borderRadius: shapeType === "circle" ? 50 : 8,
        opacity: 0.8,
        rotation: 0,
      },
    };
    setElementsState([...elementsState, newEl]);
    setSelectedElementId(newEl.id);
    setPanelTab("properties");
  };

  // Property Update Helpers
  const updateSelectedStyle = (key: string, val: any) => {
    if (!selectedElementId) return;
    setElementsState((prev: CanvasElement[]) =>
      prev.map((item) => (item.id === selectedElementId ? { ...item, styles: { ...item.styles, [key]: val } } : item))
    );
  };

  const updateSelectedProp = (key: string, val: any) => {
    if (!selectedElementId) return;
    setElementsState((prev: CanvasElement[]) =>
      prev.map((item) => (item.id === selectedElementId ? { ...item, [key]: val } : item))
    );
  };

  const selectedElement = elementsState.find((el) => el.id === selectedElementId);

  // Asset Update Handler
  const handleAssetUpdated = (type: "background" | "logo" | "signature" | "seal", asset: TemplateAssetMetadata) => {
    setAssetsState((prev: TemplateAssets) => ({ ...prev, [type]: asset }));
    if (type === "background") {
      setCanvasState((prev: CanvasSettings) => ({ ...prev, backgroundImageUrl: asset.downloadUrl }));
    } else {
      // Add or update image element on canvas
      const existing = elementsState.find((el) => el.id === `el-${type}`);
      if (existing) {
        setElementsState((prev: CanvasElement[]) =>
          prev.map((el) => (el.id === `el-${type}` ? { ...el, url: asset.downloadUrl } : el))
        );
      } else {
        const newEl: CanvasElement = {
          id: `el-${type}`,
          type: "image",
          label: `${type.toUpperCase()} Asset`,
          url: asset.downloadUrl,
          x: 50,
          y: type === "logo" ? 18 : 80,
          width: 15,
          height: 12,
          zIndex: elementsState.length + 1,
          styles: { opacity: 1, rotation: 0 },
        };
        setElementsState([...elementsState, newEl]);
      }
    }
    setToastMessage(`${type.toUpperCase()} asset updated successfully!`);
  };

  // Save Template Action
  const handleSaveTemplate = async (autoPublish = false) => {
    try {
      setSaving(true);
      setErrorMessage(null);

      const targetStatus: TemplateStatus = autoPublish ? "Published" : metadataState.status;

      if (autoPublish) {
        const check = certificateService.checkTemplateHealth({
          name: metadataState.name || "Untitled Template",
          canvas: canvasState,
          elements: elementsState,
          assets: assetsState,
        });
        if (!check.isReadyToPublish) {
          setErrorMessage(`Cannot publish template. Missing required items:\n- ${check.missingItems.join("\n- ")}`);
          setSaving(false);
          return;
        }
      }

      const templateDoc: Partial<CertificateTemplate> = {
        name: metadataState.name || "Untitled Template",
        description: metadataState.description,
        category: metadataState.category,
        status: targetStatus,
        isDefault: metadataState.isDefault,
        canvas: canvasState,
        elements: elementsState,
        assets: assetsState,
        previewData: previewDataState,
      };

      if (selectedTemplate?.id) {
        await certificateService.updateTemplate(selectedTemplate.id, templateDoc);
        setToastMessage(`Template "${metadataState.name}" saved${autoPublish ? " & published" : ""}!`);
      } else {
        await certificateService.createTemplate(templateDoc);
        setToastMessage(`New Template "${metadataState.name}" created${autoPublish ? " & published" : ""}!`);
      }

      if (autoPublish) {
        setMetadataState((prev) => ({ ...prev, status: "Published" }));
      }

      onSaveSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  // Publish / Unpublish Action
  const handlePublishToggle = async () => {
    if (!selectedTemplate?.id) {
      setErrorMessage("Please save the template first before publishing.");
      return;
    }

    try {
      setPublishing(true);
      setErrorMessage(null);

      if (metadataState.status === "Published") {
        await certificateService.unpublishTemplate(selectedTemplate.id);
        setMetadataState((prev) => ({ ...prev, status: "Draft" }));
        setToastMessage("Template unpublished to Draft.");
      } else {
        await certificateService.publishTemplate(selectedTemplate.id);
        setMetadataState((prev) => ({ ...prev, status: "Published" }));
        setToastMessage("Template Published successfully!");
      }
      onSaveSuccess();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update publish status.");
    } finally {
      setPublishing(false);
    }
  };

  // Render Element on Canvas
  const renderCanvasElement = (el: CanvasElement) => {
    if (el.isHidden) return null;
    const isSelected = selectedElementId === el.id;

    let content: React.ReactNode = null;
    if (el.type === "placeholder") {
      const val = previewDataState[el.placeholderKey || ""] || `{{${el.placeholderKey || el.label}}}`;
      content = <span className="whitespace-nowrap">{val}</span>;
    } else if (el.type === "text") {
      content = <span className="whitespace-nowrap">{el.content || el.label}</span>;
    } else if (el.type === "image") {
      content = <img src={el.url} alt={el.label} className="w-full h-full object-contain pointer-events-none drop-shadow-sm" />;
    } else if (el.type === "shape") {
      content = (
        <div
          className={cn("w-full h-full", el.shapeType === "circle" ? "rounded-full" : "rounded-md")}
          style={{
            backgroundColor: el.styles.fillColor || "transparent",
            borderColor: el.styles.borderColor || "#F59E0B",
            borderWidth: `${el.styles.borderWidth || 2}px`,
            borderStyle: "solid",
          }}
        />
      );
    }

    return (
      <div
        key={el.id}
        onMouseDown={(e) => handleStartDrag(el.id, e)}
        onTouchStart={(e) => handleStartDrag(el.id, e)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedElementId(el.id);
          setPanelTab("properties");
        }}
        className={cn(
          "absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-all select-none group border rounded-md p-1 backdrop-blur-xs flex items-center justify-center touch-none",
          isSelected && editorMode === "edit"
            ? "border-blue-500 bg-blue-500/20 text-white shadow-xl ring-2 ring-blue-400 z-30"
            : editorMode === "edit"
            ? "border-amber-400/40 bg-amber-500/10 hover:border-amber-500 z-10"
            : "border-transparent bg-transparent z-10"
        )}
        style={{
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: el.width ? `${el.width}%` : "auto",
          height: el.height ? `${el.height}%` : "auto",
          zIndex: el.zIndex,
          opacity: el.styles.opacity ?? 1,
          transform: `translate(-50%, -50%) rotate(${el.styles.rotation || 0}deg)`,
          fontFamily: el.styles.fontFamily || "Inter",
          fontSize: el.styles.fontSize ? `${el.styles.fontSize}px` : "16px",
          fontWeight: el.styles.fontWeight || "normal",
          color: el.styles.fontColor || "#1E293B",
          textAlign: el.styles.textAlign || "center",
        }}
      >
        {editorMode === "edit" && (
          <GripVertical className="w-3 h-3 opacity-60 group-hover:opacity-100 flex-shrink-0 mr-1 text-blue-400" />
        )}
        <div className="w-full h-full flex items-center justify-center">{content}</div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Studio Header Bar */}
      <div className="glass-card p-4 rounded-3xl border border-gray-200/60 dark:border-gray-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLibrary}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              {metadataState.name || "Untitled Studio Design"}
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold text-white", metadataState.status === "Published" ? "bg-emerald-500" : "bg-amber-500")}>
                {metadataState.status}
              </span>
              {lastAutoSaveTime && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Auto-saved draft ({lastAutoSaveTime})
                </span>
              )}
            </h3>
            <p className="text-[10px] text-gray-500">v{metadataState.version} • {metadataState.category}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAIDesignerModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Designer
          </button>

          <button
            onClick={() => setEditorMode(editorMode === "edit" ? "preview" : "edit")}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            {editorMode === "edit" ? "Preview Mode" : "Edit Mode"}
          </button>

          <button
            onClick={() => handleSaveTemplate(false)}
            disabled={saving}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>

          <button
            onClick={() => handleSaveTemplate(true)}
            disabled={saving || !health.isReadyToPublish}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save & Publish
          </button>

          <button
            onClick={handlePublishToggle}
            disabled={publishing || (!health.isReadyToPublish && metadataState.status !== "Published")}
            className={cn(
              "px-4 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-md disabled:opacity-50 transition-all",
              metadataState.status === "Published"
                ? "bg-gray-700 text-white hover:bg-gray-800"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            )}
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {metadataState.status === "Published" ? "Unpublish" : "Publish Template"}
          </button>
        </div>
      </div>

      {/* Validation Banner / Health Check */}
      <ValidationPanel template={currentTemplateDoc} />

      {/* Error Banner if any */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center justify-between">
          <span className="font-semibold">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="hover:underline text-[10px]">Dismiss</button>
        </div>
      )}

      {/* Studio Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-2 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex items-center justify-around text-xs">
            {[
              { id: "ai", label: "✨ AI", icon: Sparkles },
              { id: "elements", label: "Elements", icon: Type },
              { id: "properties", label: "Properties", icon: Sliders },
              { id: "canvas", label: "Canvas", icon: Square },
              { id: "assets", label: "Assets", icon: ImageIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = panelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id as any)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer",
                    isActive ? "bg-amber-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 0: AI ASSISTANT */}
          {panelTab === "ai" && (
            <AIChatAssistant
              elements={elementsState}
              onUpdateElements={setElementsState}
            />
          )}

          {/* TAB 1: ELEMENTS */}
          {panelTab === "elements" && (
            <div className="glass-card p-5 rounded-3xl space-y-4">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Add Canvas Elements</h4>
              
              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-2">Dynamic Placeholders</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: "participant_name", label: "Participant Name" },
                    { key: "event_name", label: "Event Name" },
                    { key: "issue_date", label: "Issue Date" },
                    { key: "certificate_number", label: "Cert Number" },
                    { key: "organizer", label: "Organizer Name" },
                    { key: "verification_code", label: "Verification Code" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => handleAddPlaceholderElement(item.key, item.label)}
                      className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-amber-500 font-semibold text-left text-gray-800 dark:text-gray-200 cursor-pointer transition-all"
                    >
                      + {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 mb-2">Text & Shapes</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button onClick={handleAddTextElement} className="p-2 rounded-xl bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20 text-left">
                    + Custom Text
                  </button>
                  <button onClick={() => handleAddShapeElement("line", "Line Accent")} className="p-2 rounded-xl bg-gray-50 dark:bg-gray-900 border font-semibold text-left">
                    + Divider Line
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTIES */}
          {panelTab === "properties" && (
            <div className="glass-card p-5 rounded-3xl space-y-4 text-xs">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Element Properties</h4>
              
              {selectedElement ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Label</label>
                    <input
                      type="text"
                      value={selectedElement.label}
                      onChange={(e) => updateSelectedProp("label", e.target.value)}
                      className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                    />
                  </div>

                  {selectedElement.type === "text" && (
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Text Content</label>
                      <input
                        type="text"
                        value={selectedElement.content || ""}
                        onChange={(e) => updateSelectedProp("content", e.target.value)}
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        value={selectedElement.styles.fontSize || 16}
                        onChange={(e) => updateSelectedStyle("fontSize", Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Font Color</label>
                      <input
                        type="color"
                        value={selectedElement.styles.fontColor || "#1E293B"}
                        onChange={(e) => updateSelectedStyle("fontColor", e.target.value)}
                        className="w-full h-8 bg-transparent cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800">
                    <button
                      onClick={() => updateSelectedProp("isLocked", !selectedElement.isLocked)}
                      className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-semibold flex items-center gap-1"
                    >
                      {selectedElement.isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Unlock className="w-4 h-4" />}
                      {selectedElement.isLocked ? "Locked" : "Lock Position"}
                    </button>

                    <button
                      onClick={() => {
                        setElementsState(elementsState.filter((item) => item.id !== selectedElement.id));
                        setSelectedElementId(null);
                      }}
                      className="p-2 bg-red-500/10 text-red-500 rounded-xl font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete Element
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400">Click on any canvas element to view and edit properties.</p>
              )}
            </div>
          )}

          {/* TAB 3: CANVAS SETTINGS */}
          {panelTab === "canvas" && (
            <div className="glass-card p-5 rounded-3xl space-y-4 text-xs">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Canvas & Paper Setup</h4>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={metadataState.name}
                  onChange={(e) => setMetadataState((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Golden Crest Certificate"
                  className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Paper Size</label>
                  <select
                    value={canvasState.paperSize}
                    onChange={(e) => setCanvasState((prev: CanvasSettings) => ({ ...prev, paperSize: e.target.value as any }))}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                  >
                    <option value="A4">A4 Landscape</option>
                    <option value="Letter">Letter</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={metadataState.category}
                    onChange={(e) => setMetadataState((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border rounded-xl"
                  >
                    <option value="Completion">Completion</option>
                    <option value="Participation">Participation</option>
                    <option value="Winner">Winner</option>
                    <option value="Runner Up">Runner Up</option>
                    <option value="Volunteer">Volunteer</option>
                    <option value="Speaker">Speaker</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ASSET UPLOADS */}
          {panelTab === "assets" && (
            <div className="glass-card p-5 rounded-3xl space-y-4">
              <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider">Template Assets (Storage Diffing)</h4>

              <AssetUploader
                label="Background Canvas Image"
                assetType="background"
                templateId={selectedTemplate?.id || "draft"}
                currentAsset={assetsState.background}
                onAssetChange={(asset) => handleAssetUpdated("background", asset)}
                onClearAsset={() => setAssetsState((prev: TemplateAssets) => ({ ...prev, background: undefined }))}
              />

              <AssetUploader
                label="Club Logo"
                assetType="logo"
                templateId={selectedTemplate?.id || "draft"}
                currentAsset={assetsState.logo}
                onAssetChange={(asset) => handleAssetUpdated("logo", asset)}
                onClearAsset={() => setAssetsState((prev: TemplateAssets) => ({ ...prev, logo: undefined }))}
              />

              <AssetUploader
                label="Authorized Signature"
                assetType="signature"
                templateId={selectedTemplate?.id || "draft"}
                currentAsset={assetsState.signature}
                onAssetChange={(asset) => handleAssetUpdated("signature", asset)}
                onClearAsset={() => setAssetsState((prev: TemplateAssets) => ({ ...prev, signature: undefined }))}
              />

              <AssetUploader
                label="Official Crest Seal"
                assetType="seal"
                templateId={selectedTemplate?.id || "draft"}
                currentAsset={assetsState.seal}
                onAssetChange={(asset) => handleAssetUpdated("seal", asset)}
                onClearAsset={() => setAssetsState((prev: TemplateAssets) => ({ ...prev, seal: undefined }))}
              />
            </div>
          )}
        </div>

        {/* Right Canvas Preview Area */}
        <div className="lg:col-span-7 glass-card p-6 rounded-3xl flex flex-col items-center justify-center min-h-[500px] bg-gray-950">
          <div
            ref={previewCanvasRef}
            onMouseMove={handleDragMove}
            onTouchMove={handleDragMove}
            className="relative w-full aspect-[1.414/1] rounded-2xl overflow-hidden border-2 border-amber-500/40 shadow-2xl bg-cover bg-center p-8 select-none"
            style={{
              backgroundImage: canvasState.backgroundImageUrl ? `url(${canvasState.backgroundImageUrl})` : "none",
              backgroundColor: canvasState.backgroundColor || "#FFFFFF",
            }}
          >
            {elementsState.map((el) => renderCanvasElement(el))}
          </div>
        </div>
      </div>

      <AIDesignerModal
        isOpen={showAIDesignerModal}
        onClose={() => setShowAIDesignerModal(false)}
        onApplyAIDesign={handleApplyAIDesign}
      />
    </div>
  );
}
