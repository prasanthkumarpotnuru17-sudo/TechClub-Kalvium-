import { CanonicalRegistrationDoc } from "../types/registrationTypes";

export class RegistrationModel implements CanonicalRegistrationDoc {
  id: string;
  registrationId: string;
  eventId: string;
  eventName: string;
  userId: string | null;
  name: string;
  studentName: string;
  email: string;
  department: string;
  year: string;
  status: string;
  paymentStatus: string;
  paymentRequired: boolean;
  paymentId: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  isDeleted: boolean;
  source: string;
  verificationCode?: string;
  qrCodeUrl?: string;
  schemaVersion: number;
  teamMembers?: any[];

  constructor(doc: CanonicalRegistrationDoc) {
    this.id = doc.id;
    this.registrationId = doc.registrationId;
    this.eventId = doc.eventId;
    this.eventName = doc.eventName;
    this.userId = doc.userId;
    this.name = doc.name;
    this.studentName = doc.studentName;
    this.email = doc.email;
    this.department = doc.department;
    this.year = doc.year;
    this.status = doc.status;
    this.paymentStatus = doc.paymentStatus;
    this.paymentRequired = doc.paymentRequired;
    this.paymentId = doc.paymentId;
    this.registeredAt = doc.registeredAt;
    this.createdAt = doc.createdAt;
    this.updatedAt = doc.updatedAt;
    this.deleted = doc.deleted;
    this.isDeleted = doc.isDeleted;
    this.source = doc.source;
    this.verificationCode = doc.verificationCode;
    this.qrCodeUrl = doc.qrCodeUrl;
    this.schemaVersion = doc.schemaVersion || 2;
    this.teamMembers = doc.teamMembers;
  }
}
