import { modularRegistrationService } from "@/modules/registration/services/registrationService";
import { RegisterEventInput, CanonicalRegistrationDoc } from "@/modules/registration/types/registrationTypes";

export const registrationService = {
  subscribeRegistrations(callback: (regs: any[]) => void, onError?: (error: any) => void): () => void {
    return modularRegistrationService.subscribeRegistrations(callback, onError);
  },

  async getRegistrations(): Promise<any[]> {
    return await modularRegistrationService.getAllRegistrations();
  },

  async getRegistrationsByEventId(eventId: string): Promise<any[]> {
    return await modularRegistrationService.getRegistrationsByEventId(eventId);
  },

  async getUserRegistration(eventId: string, userId?: string | null, email?: string | null): Promise<any> {
    return await modularRegistrationService.getUserRegistration(eventId, userId, email);
  },

  subscribeUserRegistrations(
    userId: string,
    email: string,
    callback: (regs: any[]) => void,
    onError?: (error: any) => void
  ): () => void {
    return modularRegistrationService.subscribeUserRegistrations(userId, email, callback, onError);
  },

  async getUserRegistrations(userId: string, email: string): Promise<any[]> {
    return await modularRegistrationService.getUserRegistrations(userId, email);
  },

  async addRegistration(reg: any): Promise<any> {
    return await modularRegistrationService.registerForEvent(reg as RegisterEventInput);
  },

  async updateRegistration(id: string, updates: any): Promise<any> {
    return await modularRegistrationService.updateRegistration(id, updates);
  },

  async updateAttendance(id: string, status: string): Promise<void> {
    return await modularRegistrationService.updateAttendance(id, status);
  },

  async cancelRegistration(id: string): Promise<void> {
    return await modularRegistrationService.cancelRegistration(id);
  },

  async deleteRegistration(id: string): Promise<void> {
    return await modularRegistrationService.deleteRegistration(id);
  },

  async migrateLegacyRegistrations(userId: string, email: string): Promise<void> {
    // Migration handled transparently by registrationConverter
    return;
  },
};
