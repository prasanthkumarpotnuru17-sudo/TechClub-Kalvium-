import { RegisterEventInput, CanonicalRegistrationDoc } from "../types/registrationTypes";
import { registrationWorkflow } from "../workflows/registrationWorkflow";
import { readRepository } from "../repositories/readRepository";
import { writeRepository } from "../repositories/writeRepository";
import { registrationSync } from "../sync/registrationSync";
import { registrationStore } from "../sync/registrationStore";

export const modularRegistrationService = {
  /**
   * Main Registration Entry Point
   */
  async registerForEvent(input: RegisterEventInput): Promise<CanonicalRegistrationDoc> {
    return await registrationWorkflow.executeRegistration(input);
  },

  /**
   * Update Registration
   */
  async updateRegistration(id: string, updates: Partial<CanonicalRegistrationDoc>): Promise<CanonicalRegistrationDoc | null> {
    await writeRepository.updateRegistration(id, updates);
    const updated = await readRepository.getRegistrationById(id);
    if (updated) {
      registrationStore.updateRegistration(updated);
    }
    return updated;
  },

  /**
   * Update Attendance Status
   */
  async updateAttendance(id: string, attendanceStatus: string): Promise<void> {
    await writeRepository.updateRegistration(id, { attendance: attendanceStatus } as any);
    const updated = await readRepository.getRegistrationById(id);
    if (updated) {
      registrationStore.updateRegistration(updated);
    }
  },

  /**
   * Cancel Registration
   */
  async cancelRegistration(id: string): Promise<void> {
    await writeRepository.cancelRegistration(id);
    // Remove immediately from the store so the event card shows "Register Now" instantly.
    // The Firestore onSnapshot listener will fire shortly after and confirm the state.
    registrationStore.removeRegistration(id);
  },

  /**
   * Delete Registration
   */
  async deleteRegistration(id: string): Promise<void> {
    await writeRepository.deleteRegistration(id);
    registrationStore.removeRegistration(id);
  },

  /**
   * Get User Registrations
   */
  async getUserRegistrations(userId: string, email: string): Promise<CanonicalRegistrationDoc[]> {
    return await readRepository.getUserRegistrations(userId, email);
  },

  /**
   * Get All Registrations
   */
  async getAllRegistrations(): Promise<CanonicalRegistrationDoc[]> {
    return await readRepository.getAllRegistrations();
  },

  /**
   * Get Registrations By Event ID
   */
  async getRegistrationsByEventId(eventId: string): Promise<CanonicalRegistrationDoc[]> {
    return await readRepository.getRegistrationsByEventId(eventId);
  },

  /**
   * Get Single User Registration for Event
   */
  async getUserRegistration(eventId: string, userId?: string | null, email?: string | null): Promise<CanonicalRegistrationDoc | null> {
    return await readRepository.getUserRegistration(eventId, userId, email);
  },

  /**
   * Realtime Subscriptions
   */
  subscribeUserRegistrations(
    userId: string,
    email: string,
    callback: (regs: CanonicalRegistrationDoc[]) => void,
    onError?: (err: any) => void
  ): () => void {
    return registrationSync.subscribeUserRegistrations(userId, email, callback, onError);
  },

  subscribeRegistrations(
    callback: (regs: CanonicalRegistrationDoc[]) => void,
    onError?: (err: any) => void
  ): () => void {
    return registrationSync.subscribeAllRegistrations(callback, onError);
  },
};
