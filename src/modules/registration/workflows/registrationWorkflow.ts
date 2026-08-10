import { RegisterEventInput, CanonicalRegistrationDoc } from "../types/registrationTypes";
import { normalizeRegistrationInput } from "../validation/registrationValidation";
import { transactionRepository } from "../repositories/transactionRepository";
import { registrationNotifications } from "../notifications/registrationNotifications";
import { registrationStore } from "../sync/registrationStore";

export const registrationWorkflow = {
  /**
   * Orchestrated Registration Pipeline:
   * 1. STEP 1: Register clicked
   * 2. STEP 2: Validate & Normalize payload
   * 3. STEP 3: Duplicate check & capacity guard
   * 4. STEP 4: Atomic Firestore Transaction
   * 5. STEP 5: Realtime Sync & Shared Store update
   * 6. STEP 6: Post-Commit Email Notification dispatch
   */
  async executeRegistration(input: RegisterEventInput): Promise<CanonicalRegistrationDoc> {
    console.log(`[Registration] STEP 1: Register clicked for event "${input.eventId}" by "${input.email || input.userId}"`);

    // STEP 2: Normalize input into canonical schema
    const canonicalDoc = normalizeRegistrationInput(input);
    console.log(`[Registration] STEP 2: Payload normalized | registrationId: "${canonicalDoc.id}" | status: "${canonicalDoc.status}"`);

    // STEP 3 & 4: Atomic Firestore Transaction with duplicate & capacity guards
    console.log(`[Registration] STEP 3: Executing Firestore transaction...`);
    const savedDoc = await transactionRepository.executeRegistrationTransaction(canonicalDoc);
    console.log(`[Registration] STEP 4: Document written to Firestore ✓ | id: "${savedDoc.id}"`);

    // STEP 5: Update shared store immediately
    registrationStore.updateRegistration(savedDoc);
    console.log(`[Registration] STEP 5: Realtime Shared Store updated ✓`);

    // STEP 6: Post-commit email dispatch
    if (!savedDoc.paymentRequired) {
      registrationNotifications.sendConfirmationEmail(savedDoc).catch((err) => {
        console.warn("[Registration] STEP 6: Non-blocking confirmation email notice:", err);
      });
    }

    return savedDoc;
  },
};
