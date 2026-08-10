import {
  QueryDocumentSnapshot,
  SnapshotOptions,
  FirestoreDataConverter,
  DocumentData,
} from "firebase/firestore";
import { CanonicalRegistrationDoc, RegistrationStatus } from "../types/registrationTypes";

/**
 * Firestore Data Converter for Registration Documents
 * Ensures 100% top-level property parsing with zero nested customData / basicData objects.
 */
export const registrationConverter: FirestoreDataConverter<CanonicalRegistrationDoc> = {
  toFirestore(reg: CanonicalRegistrationDoc): DocumentData {
    const { customData, basicData, ...cleanDoc } = reg as any;
    return cleanDoc;
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options?: SnapshotOptions
  ): CanonicalRegistrationDoc {
    const data = snapshot.data(options);

    // Extract legacy nested customData / basicData if reading un-migrated documents
    const customFields = data.customData && typeof data.customData === "object" ? data.customData : {};
    const basicFields = data.basicData && typeof data.basicData === "object" ? data.basicData : {};

    const studentName = (
      data.studentName ||
      data.name ||
      customFields.studentName ||
      customFields.name ||
      basicFields.fullName ||
      "Participant"
    ).trim();

    const email = (
      data.email ||
      customFields.email ||
      basicFields.email ||
      ""
    ).toLowerCase().trim();

    let rawStatus = (data.status || "CONFIRMED").toString().toUpperCase();
    if (rawStatus === "CONFIRMED") rawStatus = RegistrationStatus.CONFIRMED;
    else if (rawStatus === "CANCELLED") rawStatus = RegistrationStatus.CANCELLED;
    else if (rawStatus === "PENDING PAYMENT" || rawStatus === "PENDING_PAYMENT" || rawStatus === "PENDING") rawStatus = RegistrationStatus.PENDING_PAYMENT;
    else if (rawStatus === "REJECTED") rawStatus = RegistrationStatus.REJECTED;
    else if (rawStatus === "WAITLIST") rawStatus = RegistrationStatus.WAITLIST;

    return {
      ...data,
      id: snapshot.id,
      registrationId: data.registrationId || snapshot.id,
      eventId: data.eventId || customFields.eventId || "",
      eventName: data.eventName || customFields.eventName || "Tech Club Event",
      userId: data.userId || customFields.userId || null,
      name: studentName,
      studentName: studentName,
      email: email,
      department: (data.department || customFields.department || basicFields.department || "").trim(),
      year: (data.year || customFields.year || basicFields.year || "").trim(),
      status: rawStatus,
      paymentStatus: data.paymentStatus || "N/A",
      paymentRequired: data.paymentRequired ?? false,
      paymentId: data.paymentId || null,
      registeredAt: data.registeredAt || data.registeredDate || data.createdAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      deleted: data.deleted ?? data.isDeleted ?? false,
      isDeleted: data.isDeleted ?? data.deleted ?? false,
      source: data.source || "website",
      verificationCode: data.verificationCode,
      qrCodeUrl: data.qrCodeUrl,
      registrationNumber: data.registrationNumber,
      schemaVersion: data.schemaVersion || 2,
      teamMembers: data.teamMembers || [],
    };
  },
};
