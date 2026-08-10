export type EventCategory = "campus" | "off-campus" | "online";

export interface EventAgendaItem {
  time: string;
  title: string;
  description: string;
}

export interface EventMentor {
  name: string;
  role: string;
  avatar: string;
}

export type EventReminderSchedule = "2_days" | "1_day" | "1_hour";

export interface EventReminderConfig {
  enabled: boolean;
  schedules: EventReminderSchedule[];
}

export interface ClubEvent {
  id: string;
  title: string;
  category: EventCategory;
  type: string;
  date: string;
  venue: string;
  seatsLeft: number;
  bannerGradient: string;
  description: string;
  prizePool?: string;
  longDescription?: string;
  agenda?: EventAgendaItem[];
  highlights?: string[];
  prerequisites?: string[];
  mentors?: EventMentor[];
  requiredFields?: string[]; // Dynamic required fields e.g., ["college", "academicYear", "github"]
  reminders?: EventReminderConfig;
  // Paid Event Attributes
  isPaid?: boolean;
  registrationFee?: number;
  upiId?: string;
  receiverName?: string;
  paymentInstructions?: string;
  paymentEnabled?: boolean;
  generatedQrData?: string;
}

