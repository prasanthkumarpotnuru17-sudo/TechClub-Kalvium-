export type UserRole = "Student" | "Volunteer" | "Admin" | "Super Admin";

export type EventStatus = "Published" | "Draft" | "Closed" | "Archived" | "Completed";

export type EventType = "Campus" | "External";

export type OpportunityMode = "Online" | "Offline" | "Hybrid";

export interface ClubInfoSettings {
  clubName: string;
  tagline: string;
  description: string;
  academicYear: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

export interface SocialLinksSettings {
  github: string;
  linkedin: string;
  instagram: string;
  discord: string;
  whatsapp: string;
  youtube: string;
}

export interface IntegrationConfig {
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  n8nRegistrationWebhook: string;
  n8nNotificationWebhook: string;
  n8nSyncWebhook: string;
  googleSpreadsheetId: string;
  googleSheetsAutoSync: boolean;
}
