import { initializeApp, getApps, cert, getApp, App, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import { getStorage, Storage } from "firebase-admin/storage";

let serviceAccountJson: any = null;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } catch (e) {
    console.warn("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON:", e);
  }
}

function formatPrivateKey(key?: string): string | undefined {
  if (!key) return undefined;
  let normalized = key.trim();
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized.replace(/\\n/g, "\n");
}

const projectId = serviceAccountJson?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = serviceAccountJson?.client_email || process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = serviceAccountJson?.private_key || process.env.FIREBASE_PRIVATE_KEY;
const privateKey = formatPrivateKey(rawPrivateKey);
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const googleAppCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

export const hasServiceAccountKeys = Boolean(projectId && clientEmail && privateKey);
export const hasGacCreds = Boolean(googleAppCreds);

export const isAdminSdkConfigured = hasServiceAccountKeys || hasGacCreds;

function getAdminApp(): App | null {
  try {
    if (getApps().length > 0) return getApp();

    // Mode 1: Explicit Service Account Credentials (cert)
    if (hasServiceAccountKeys) {
      try {
        return initializeApp({
          credential: cert({
            projectId: projectId!,
            clientEmail: clientEmail!,
            privateKey: privateKey!,
          }),
          storageBucket,
        });
      } catch (err) {
        console.error("[Firebase Admin] Initialization failed with Service Account cert:", err);
        return null;
      }
    }

    // Mode 2: Google Application Default Credentials (ADC) file
    if (hasGacCreds) {
      try {
        return initializeApp({
          credential: applicationDefault(),
          projectId: projectId || undefined,
          storageBucket,
        });
      } catch (err) {
        console.error("[Firebase Admin] Initialization failed with GOOGLE_APPLICATION_CREDENTIALS:", err);
        return null;
      }
    }

    // Mode 3: Missing credentials — log explicit server warning
    if (typeof window === "undefined") {
      console.warn(
        "[Firebase Admin] Service Account credentials not configured.\n" +
        "To enable server-side Admin SDK operations:\n" +
        "  1) Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local\n" +
        "  OR\n" +
        "  2) Set GOOGLE_APPLICATION_CREDENTIALS path in .env.local\n" +
        "  Then restart the Next.js dev server (npm run dev)."
      );
    }
  } catch (globalErr) {
    console.error("[Firebase Admin] Top-level initialization exception caught:", globalErr);
  }
  return null;
}

let adminApp: App | null = null;
try {
  adminApp = getAdminApp();
} catch (e) {
  console.error("[Firebase Admin] Error running getAdminApp():", e);
}

let adminDbInstance: Firestore | null = null;
let adminAuthInstance: Auth | null = null;
let adminStorageInstance: Storage | null = null;

if (adminApp) {
  try {
    adminDbInstance = getFirestore(adminApp);
  } catch (e) {
    console.error("[Firebase Admin] Failed to initialize Firestore:", e);
  }
  try {
    adminAuthInstance = getAuth(adminApp);
  } catch (e) {
    console.error("[Firebase Admin] Failed to initialize Auth:", e);
  }
  try {
    adminStorageInstance = getStorage(adminApp);
  } catch (e) {
    console.error("[Firebase Admin] Failed to initialize Storage:", e);
  }
}

export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
export const adminStorage = adminStorageInstance;

if (typeof window === "undefined") {
  console.log("[Firebase Admin Audit Log]", {
    projectId: !!projectId,
    clientEmail: !!clientEmail,
    privateKey: !!privateKey,
    storageBucket: !!storageBucket,
    adminDb: !!adminDb,
    isAdminSdkConfigured,
  });
}



