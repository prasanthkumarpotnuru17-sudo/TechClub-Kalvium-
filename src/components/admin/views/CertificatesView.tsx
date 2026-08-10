"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  Layout,
  Layers,
  Edit3,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  X,
  Plus
} from "lucide-react";
import {
  CertificateTemplate,
  IssuedCertificateDoc,
  certificateService,
  DEFAULT_SYSTEM_TEMPLATES
} from "@/services/certificateService";
import { useAuthContext } from "@/context/AuthContext";
import { DashboardView } from "../certificates/DashboardView";
import { TemplateLibrary } from "../certificates/TemplateLibrary";
import { TemplateStudio } from "../certificates/TemplateStudio";
import { IssueCertificatesWizard } from "../certificates/IssueCertificatesWizard";
import { IssuedCertificatesLedger } from "../certificates/IssuedCertificatesLedger";
import { cn } from "@/lib/utils";

// Re-export key interfaces for backward compatibility across imports
export type { CertificateTemplate, IssuedCertificateDoc };

export function CertificatesView() {
  const { user, firebaseUser, role, loading: authLoading } = useAuthContext();
  const isAuthorized = role === "admin" || role === "super_admin" || role === "coordinator";

  // Sub-tabs: dashboard | templates | editor | generator | issued
  const [activeSubTab, setActiveSubTab] = useState<"dashboard" | "templates" | "editor" | "generator" | "issued">("dashboard");

  // State Management (Live Firestore Data Only)
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<IssuedCertificateDoc[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CertificateTemplate | null>(null);

  // Status & Feedback State
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal Deletion Protection State
  const [deleteModalDoc, setDeleteModalDoc] = useState<CertificateTemplate | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);

  // Firestore Subscriptions Listener
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const unsubCertificates = certificateService.subscribeCertificates(
      (certs) => setIssuedCerts(certs),
      (err) => console.error("[CertificatesView] Certificates subscription error:", err)
    );

    const unsubTemplates = certificateService.subscribeTemplates(
      (tpls) => {
        setTemplates(tpls);
        setLoading(false);
      },
      (err) => {
        console.error("[CertificatesView] Templates subscription error:", err);
        setErrorMessage("Failed to load certificate templates from Firestore.");
        setLoading(false);
      }
    );

    return () => {
      unsubCertificates();
      unsubTemplates();
    };
  }, [authLoading, isAuthorized]);

  // Action Handlers
  const handleOpenStudio = (template?: CertificateTemplate) => {
    setSelectedTemplate(template || null);
    setActiveSubTab("editor");
  };

  const handlePublishToggle = async (tpl: CertificateTemplate) => {
    try {
      const userId = user?.email || firebaseUser?.email || "admin";
      if (tpl.status === "Published") {
        await certificateService.unpublishTemplate(tpl.id, userId);
        setToastMessage(`Template "${tpl.name}" unpublished to Draft.`);
      } else {
        await certificateService.publishTemplate(tpl.id, userId);
        setToastMessage(`Template "${tpl.name}" published successfully!`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update publish status.");
    }
  };

  const handleSetDefault = async (tpl: CertificateTemplate) => {
    try {
      await certificateService.setDefaultTemplate(tpl.id);
      setToastMessage(`"${tpl.name}" is now set as the default template.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to set default template.");
    }
  };

  const handleDuplicate = async (tpl: CertificateTemplate) => {
    try {
      const userId = user?.email || firebaseUser?.email || "admin";
      const dup = await certificateService.duplicateTemplate(tpl.id, userId);
      setToastMessage(`Duplicated template as "${dup.name}".`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to duplicate template.");
    }
  };

  const handleArchive = async (tpl: CertificateTemplate) => {
    try {
      const userId = user?.email || firebaseUser?.email || "admin";
      await certificateService.archiveTemplate(tpl.id, userId);
      setToastMessage(`Template "${tpl.name}" archived.`);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to archive template.");
    }
  };

  const handleDeleteRequest = (tpl: CertificateTemplate) => {
    setDeleteModalDoc(tpl);
    setDeleteWarning(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalDoc) return;
    try {
      await certificateService.deleteTemplate(deleteModalDoc.id);
      setToastMessage(`Template "${deleteModalDoc.name}" deleted.`);
      setDeleteModalDoc(null);
    } catch (err: any) {
      setDeleteWarning(err?.message || "Deletion prevented.");
    }
  };

  // Filtered Templates for Issuance Workflow (Prioritizes Published, falls back to active or default templates)
  const publishedTemplates = React.useMemo(() => {
    const published = templates.filter((t) => t.status === "Published" && !t.isDeleted);
    if (published.length > 0) return published;

    const nonDeleted = templates.filter((t) => !t.isDeleted);
    if (nonDeleted.length > 0) return nonDeleted;

    return DEFAULT_SYSTEM_TEMPLATES;
  }, [templates]);

  // Access Restriction
  if (!isAuthorized) {
    return (
      <div className="p-10 text-center space-y-4 max-w-lg mx-auto glass-card rounded-3xl border border-red-500/20 my-12">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Access Restricted</h3>
        <p className="text-xs text-gray-500">
          You do not have permission to view or manage certificate templates. Please contact an Administrator or Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:bg-red-500/20 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              Certificate Management Module
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Design templates, issue official certificates, render high-res PDFs, and manage credential ledgers.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          {[
            { id: "dashboard", label: "Dashboard", icon: Layout },
            { id: "templates", label: `Templates (${templates.length})`, icon: Layers },
            { id: "editor", label: "Template Studio", icon: Edit3 },
            { id: "generator", label: "Issue Certificates", icon: Send },
            { id: "issued", label: `Issued (${issuedCerts.length})`, icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "editor" && !selectedTemplate) {
                    handleOpenStudio();
                  } else {
                    setActiveSubTab(tab.id as any);
                  }
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Delegation */}
      {loading ? (
        <div className="p-12 text-center text-xs font-semibold text-gray-400 glass-card rounded-3xl">
          Loading certificate templates & credentials from Firestore...
        </div>
      ) : (
        <>
          {activeSubTab === "dashboard" && (
            <DashboardView
              templates={templates}
              issuedCerts={issuedCerts}
              onLaunchWizard={() => setActiveSubTab("generator")}
            />
          )}

          {activeSubTab === "templates" && (
            <TemplateLibrary
              templates={templates}
              onOpenStudio={handleOpenStudio}
              onPublishToggle={handlePublishToggle}
              onSetDefault={handleSetDefault}
              onDuplicate={handleDuplicate}
              onArchive={handleArchive}
              onDelete={handleDeleteRequest}
            />
          )}

          {activeSubTab === "editor" && (
            <TemplateStudio
              selectedTemplate={selectedTemplate}
              onBackToLibrary={() => setActiveSubTab("templates")}
              onSaveSuccess={() => {
                setToastMessage("Template saved to Firestore!");
              }}
            />
          )}

          {activeSubTab === "generator" && (
            <IssueCertificatesWizard
              publishedTemplates={publishedTemplates}
              onIssuanceComplete={() => {
                setToastMessage("Certificates successfully issued!");
                setActiveSubTab("issued");
              }}
            />
          )}

          {activeSubTab === "issued" && (
            <IssuedCertificatesLedger issuedCerts={issuedCerts} />
          )}
        </>
      )}

      {/* Deletion Protection Modal */}
      {deleteModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl space-y-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-2xl relative">
            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete Template Confirmation
            </h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to delete <strong>"{deleteModalDoc.name}"</strong>? If this template has issued certificates, Firestore deletion will be blocked and you can archive it instead.
            </p>

            {deleteWarning && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold">
                {deleteWarning}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModalDoc(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
