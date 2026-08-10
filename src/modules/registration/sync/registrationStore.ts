import { CanonicalRegistrationDoc } from "../types/registrationTypes";

type Listener = (regs: CanonicalRegistrationDoc[]) => void;

/**
 * Singleton In-Memory Registration Store
 * Shared reactive state store across all React components.
 */
class RegistrationStore {
  private regsMap = new Map<string, CanonicalRegistrationDoc>();
  private listeners = new Set<Listener>();

  getRegistrations(): CanonicalRegistrationDoc[] {
    return Array.from(this.regsMap.values());
  }

  setRegistrations(regs: CanonicalRegistrationDoc[]) {
    this.regsMap.clear();
    regs.forEach((r) => this.regsMap.set(r.id, r));
    this.notify();
  }

  updateRegistration(reg: CanonicalRegistrationDoc) {
    this.regsMap.set(reg.id, reg);
    this.notify();
  }

  removeRegistration(id: string) {
    this.regsMap.delete(id);
    this.notify();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getRegistrations());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getRegistrations();
    this.listeners.forEach((fn) => fn(list));
  }
}

export const registrationStore = new RegistrationStore();
