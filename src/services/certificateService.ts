import { 
  certificateTemplateService, 
  DEFAULT_SYSTEM_TEMPLATES,
  CertificateTemplate, 
  TemplateCategory, 
  TemplateStatus, 
  CanvasElement, 
  CanvasSettings,
  ElementType,
  ShapeType,
  TemplateAssetMetadata,
  TemplateAssets,
  TemplateHealthResult
} from "./certificateTemplateService";
import { certificatePDFService } from "./certificatePDFService";
import { certificateStorageService } from "./certificateStorageService";
import { certificateIssueService, IssuedCertificateDoc } from "./certificateIssueService";

export const certificateService = {
  // ── Asset & Storage Operations ──────────────────────────────────
  uploadTemplateAsset: certificateStorageService.uploadTemplateAsset.bind(certificateStorageService),
  uploadAsset: certificateStorageService.uploadAsset.bind(certificateStorageService),
  deleteAsset: certificateStorageService.deleteAsset.bind(certificateStorageService),
  uploadCertificatePDF: certificateStorageService.uploadCertificatePDF.bind(certificateStorageService),

  // ── Template CRUD & Subscription ─────────────────────────────────
  subscribeTemplates: certificateTemplateService.subscribeTemplates.bind(certificateTemplateService),
  getTemplate: certificateTemplateService.getTemplate.bind(certificateTemplateService),
  getTemplates: certificateTemplateService.getTemplates.bind(certificateTemplateService),
  createTemplate: certificateTemplateService.createTemplate.bind(certificateTemplateService),
  updateTemplate: certificateTemplateService.updateTemplate.bind(certificateTemplateService),
  publishTemplate: certificateTemplateService.publishTemplate.bind(certificateTemplateService),
  unpublishTemplate: certificateTemplateService.unpublishTemplate.bind(certificateTemplateService),
  checkTemplateHealth: certificateTemplateService.checkTemplateHealth.bind(certificateTemplateService),
  setDefaultTemplate: certificateTemplateService.setDefaultTemplate.bind(certificateTemplateService),
  archiveTemplate: certificateTemplateService.archiveTemplate.bind(certificateTemplateService),
  restoreTemplate: certificateTemplateService.restoreTemplate.bind(certificateTemplateService),
  deleteTemplate: certificateTemplateService.deleteTemplate.bind(certificateTemplateService),
  duplicateTemplate: certificateTemplateService.duplicateTemplate.bind(certificateTemplateService),
  incrementTemplateUsage: certificateTemplateService.incrementTemplateUsage.bind(certificateTemplateService),
  searchTemplates: certificateTemplateService.searchTemplates.bind(certificateTemplateService),

  // ── Issuance & PDF Pipeline ──────────────────────────────────────
  subscribeCertificates: certificateIssueService.subscribeCertificates.bind(certificateIssueService),
  generateNextCertificateNumber: certificateIssueService.generateNextCertificateNumber.bind(certificateIssueService),
  checkAlreadyIssued: certificateIssueService.checkAlreadyIssued.bind(certificateIssueService),
  issueCertificate: certificateIssueService.issueCertificate.bind(certificateIssueService),
  batchIssueCertificates: certificateIssueService.batchIssueCertificates.bind(certificateIssueService),
  regenerateCertificatePDF: certificateIssueService.regenerateCertificatePDF.bind(certificateIssueService),
  softDeleteCertificate: certificateIssueService.softDeleteCertificate.bind(certificateIssueService),
  deleteCertificate: certificateIssueService.deleteCertificate.bind(certificateIssueService),

  // ── PDF Renderer ────────────────────────────────────────────────
  generatePDFBlob: certificatePDFService.generatePDFBlob.bind(certificatePDFService),
};

export {
  certificateTemplateService,
  DEFAULT_SYSTEM_TEMPLATES,
  certificatePDFService,
  certificateStorageService,
  certificateIssueService,
};

export type { 
  IssuedCertificateDoc,
  CertificateTemplate,
  TemplateCategory,
  TemplateStatus,
  CanvasElement,
  CanvasSettings,
  ElementType,
  ShapeType,
  TemplateAssetMetadata,
  TemplateAssets,
  TemplateHealthResult
};
