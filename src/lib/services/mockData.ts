export interface KPIItem {
  id: string;
  title: string;
  value: string;
  numericValue: number;
  change: string;
  isPositive: boolean;
  trend: number[];
  iconName: string;
  description: string;
}

export interface ClubStatusData {
  clubName: string;
  academicYear: string;
  status: "Active" | "Inactive";
  activeMembers: number;
  facultyCoordinator: string;
  facultyDesignation: string;
  studentPresident: string;
  studentPresidentYear: string;
  totalDomains: number;
  workshopsConducted: number;
  hackathonsConducted: number;
  industrySessions: number;
  communityGrowth: string;
  membershipTarget: { current: number; target: number };
  eventCompletionTarget: { current: number; target: number };
  annualActivityTarget: { current: number; target: number };
  timeline: {
    id: string;
    date: string;
    title: string;
    category: string;
    description: string;
    status: "Completed" | "In Progress" | "Upcoming";
  }[];
}

export interface FormField {
  id: string;
  label: string;
  type: "text" | "number" | "email" | "phone" | "dropdown" | "radio" | "checkbox" | "date";
  required: boolean;
  options?: string[];
}

export interface RegistrationConfig {
  basicFields: {
    fullName: boolean;
    email: boolean;
    registerNumber: boolean;
    phoneNumber: boolean;
    department: boolean;
    year: boolean;
  };
  isTeamEvent: boolean;
  minTeamSize: number;
  maxTeamSize: number;
  customFields: FormField[];
}

export interface TeamMemberDetails {
  fullName: string;
  email: string;
  registerNumber?: string;
  phoneNumber?: string;
  department?: string;
  year?: string;
}

export type EventReminderSchedule = "2_days" | "1_day" | "1_hour";

export interface EventReminderConfig {
  enabled: boolean;
  schedules: EventReminderSchedule[];
}

export interface EventItem {
  id: string;
  title: string;
  banner: string;
  description: string;
  type: "Campus" | "External";
  venue: string;
  date: string;
  time: string;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  capacity: number;
  registeredCount: number;
  organizer: string;
  status: "Published" | "Draft" | "Completed" | "Archived" | "Deleted" | "Closed" | "Cancelled" | "Upcoming";
  category: "AI/ML" | "Web Dev" | "Cloud" | "Hackathon" | "Cybersecurity" | "Design";
  teamSize?: number;
  mode?: "Campus" | "Off-Campus" | "Online";
  registrationConfig?: RegistrationConfig;
  reminders?: EventReminderConfig;
  // Paid Event Properties
  isPaid?: boolean;
  registrationFee?: number;
  upiId?: string;
  receiverName?: string;
  paymentInstructions?: string;
  paymentEnabled?: boolean;
  generatedQrData?: string;
}

export type PaymentStatus = "Pending" | "Verified" | "Rejected" | "Expired" | "Refunded" | "N/A";

export interface RegistrationItem {
  id: string;
  name: string;
  studentName?: string;
  email: string;
  userId?: string | null;
  department: string;
  year: string;
  registeredDate: string;
  attendance: "Attended" | "Absent" | "Pending" | "Checked In";
  status: "Pending" | "Confirmed" | "Waitlist" | "Cancelled" | "Checked In" | "Attended" | "Absent" | "Payment Pending" | "Payment Rejected";
  eventId: string;
  eventName: string;
  eventDate?: string;
  eventTime?: string;
  venue?: string;
  eventSnapshot?: {
    title?: string;
    date?: string;
    time?: string;
    venue?: string;
  };
  source?: "website" | "admin" | "import" | "api" | string;
  registeredAt?: string;
  deleted?: boolean;
  githubUrl?: string;
  signupMethod?: "Google OAuth" | "Email / Password";
  registrationId?: string; // e.g. TKT-ABCDEF
  registrationNumber?: string; // e.g. TCM-2026-0001
  ticketCode?: string;
  verificationCode?: string;
  qrCodeUrl?: string;
  registrationType?: "self" | "manual";
  overrideCapacity?: boolean;
  checkedIn?: boolean;
  certificateIssued?: boolean;
  registeredBy?: string;
  registeredByRole?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  isDeleted?: boolean;
  userDeleted?: boolean;
  accountDeletedAt?: string;
  teamMembers?: TeamMemberDetails[];
  // Payment Reference Fields (Normalized Schema)
  paymentRequired?: boolean;
  paymentId?: string | null;
  paymentStatus?: PaymentStatus;
}

export interface PaymentRecord {
  id: string;
  paymentId: string;
  registrationId: string;
  eventId: string;
  eventTitle?: string;
  userId: string | null;
  studentName: string;
  studentEmail: string;
  amount: number;
  transactionId: string; // UTR Number
  paymentMethod: string; // e.g. "UPI"
  paymentScreenshotUrl: string;
  status: "Pending" | "Verified" | "Rejected" | "Expired" | "Refunded";
  submittedAt: string;
  expiresAt: string;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  verifiedByRole?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "member" | "volunteer" | "coordinator" | "admin" | "super_admin";
  department: string;
  year: string;
  joinedDate: string;
  signupMethod: "Google OAuth" | "Email / Password";
  status: "Active" | "Blocked" | "Pending";
  eventsAttended: number;
  avatar: string;
}

export interface OpportunityItem {
  id: string;
  title: string;
  companyOrOrg: string;
  type: "Hackathon" | "Internship" | "Grant" | "Workshop" | "Open Source";
  location: string;
  mode: "Online" | "Offline" | "Hybrid";
  deadline: string;
  stipendOrPrize: string;
  status: "Active" | "Expired" | "Draft";
  applyUrl: string;
  category: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "Event Reminder" | "New Event" | "Registration Closing" | "Club Announcement";
  targetAudience: string;
  sentAt: string;
  sentBy: string;
  readCount: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  imageUrl: string;
  category: "Workshops" | "Hackathons" | "Cultural" | "Industry Talks" | "Team Building";
  eventDate: string;
  likes: number;
}

export interface TeamMemberItem {
  id: string;
  name: string;
  roleGroup: "Faculty Coordinators" | "Core Team" | "Student Leads" | "Volunteers";
  designation: string;
  email: string;
  phone: string;
  department: string;
  avatar: string;
  bio?: string;
  avatarInitials?: string;
  avatarBg?: string;
  github?: string;
  linkedin?: string;
}

export interface ActivityItem {
  id: string;
  type: string;
  user: string;
  userRole?: string;
  action: string;
  target: string;
  targetType?: string;
  targetId?: string;
  timestamp: string;
  iconType: string;
  metadata?: Record<string, any>;
}

// Clean Data Arrays (No Mock Data)
export const mockKPICards: KPIItem[] = [];

export const mockClubStatus: ClubStatusData = {
  clubName: "Tech Club @ Kalvium",
  academicYear: "2025 - 2026",
  status: "Active",
  activeMembers: 0,
  facultyCoordinator: "",
  facultyDesignation: "",
  studentPresident: "",
  studentPresidentYear: "",
  totalDomains: 0,
  workshopsConducted: 0,
  hackathonsConducted: 0,
  industrySessions: 0,
  communityGrowth: "0%",
  membershipTarget: { current: 0, target: 100 },
  eventCompletionTarget: { current: 0, target: 10 },
  annualActivityTarget: { current: 0, target: 50 },
  timeline: []
};

export const mockEvents: EventItem[] = [];
export const mockRegistrations: RegistrationItem[] = [];
export const mockUsers: UserItem[] = [];
export const mockOpportunities: OpportunityItem[] = [];
export const mockNotifications: NotificationItem[] = [];
export const mockGallery: GalleryItem[] = [];
export const mockTeam: TeamMemberItem[] = [];
export const mockRecentActivities: ActivityItem[] = [];
export const mockEventsMonthly = [];
export const mockEventCategories = [];
export const mockRegistrationTrends = [];
export const mockDepartmentDistribution = [];
export const mockYearDistribution = [];
export const mockRegistrationStatusBreakdown = [];
export const mockOpportunityDistribution = [];

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  targetAudience: string;
  category: "New Event" | "Certificates" | "Recruitment" | "General" | "Important";
  date: string;
  readCount: number;
  isImportant?: boolean;
}

export const mockAnnouncements: AnnouncementItem[] = [];

// Production Data Models for SaaS Architecture
export interface NotificationBannerItem {
  id: string;
  type: "event" | "warning" | "success" | "maintenance";
  title: string;
  message: string;
  buttonText?: string;
  buttonLink?: string;
  dismissible: boolean;
  expiresAt?: string;
}

export interface FeaturedEventData {
  id: string;
  title: string;
  description: string;
  bannerImage: string;
  eventDate: string;
  venue: string;
  seatsRemaining: number;
  registrationStatus: "Open" | "Fast Filling" | "Closed";
  category: string;
  registrationUrl: string;
  prizePool?: string;
}

export interface HeroStatisticItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  numericTarget: number;
  suffix: string;
}

export interface GalleryPhotoItem {
  id: string;
  title: string;
  description: string;
  event: string;
  date: string;
  photographer: string;
  src: string;
  category: "Workshops" | "Hackathons" | "Industry Talks" | "Team Building";
  likes: number;
  heightClass?: string;
}

export const mockNotificationBanners: NotificationBannerItem[] = [];

export const mockFeaturedEvent: FeaturedEventData = {
  id: "",
  title: "No Featured Event",
  description: "Check back soon for upcoming events.",
  bannerImage: "/vr_headset.png",
  eventDate: "",
  venue: "",
  seatsRemaining: 0,
  registrationStatus: "Closed",
  category: "General",
  registrationUrl: "#events"
};

export const mockHeroStatistics: HeroStatisticItem[] = [];
export const mockGalleryItems: GalleryPhotoItem[] = [];

// Production Onboarding Data Models (Firebase / Firestore Ready)
export type ParticipantType = "Student" | "Professional" | "Mentor" | "Alumni" | "Volunteer";

export interface UserProfileData {
  // Student Profile
  college?: string;
  course?: string;
  department?: string;
  academicYear?: string;
  
  // Professional Profile
  company?: string;
  jobTitle?: string;
  yearsOfExperience?: string;
  skills?: string;

  // Mentor Profile
  organization?: string;
  designation?: string;
  expertise?: string;
  availability?: string;

  // Alumni Profile
  graduationYear?: string;

  // Volunteer Profile
  interestedTeam?: string;
  experience?: string;

  // Common Fields
  city?: string;
  domain?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  bio?: string;
  avatar?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  profileCompleted: boolean;
  participantType: ParticipantType | null;
  createdAt: string;
  updatedAt: string;
  profile: UserProfileData;
}



