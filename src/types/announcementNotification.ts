/**
 * Announcement Notification Interfaces & Types
 */

export interface AnnouncementDetails {
  id?: string;
  title: string;
  message: string;
  category?: string;
  priority?: string;
  isImportant?: boolean;
  publishedAt?: string;
  date?: string;
  url?: string;
}

export interface UserRecipientPayload {
  email: string;
  name: string;
}

export interface AnnouncementNotificationRequest {
  announcementId?: string;
  announcement?: AnnouncementDetails;
  recipients?: UserRecipientPayload[];
  eventId?: string;
}

export interface N8nAnnouncementPayload {
  type: "announcement";
  recipients: UserRecipientPayload[];
  announcement: {
    title: string;
    message: string;
    category: string;
    priority: string;
    publishedAt: string;
  };
  button: {
    text: string;
    url: string;
  };
}

export interface AnnouncementNotificationResponse {
  success: boolean;
  message: string;
  data?: {
    totalRecipients: number;
    successful: number;
    failed: number;
  } | null;
  error?: string | null;
}
