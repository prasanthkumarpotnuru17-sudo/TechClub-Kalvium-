import { initializeApp, getApps, cert, getApp, App, applicationDefault } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";
import type { Storage } from "firebase-admin/storage";

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
  normalized = normalized.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");

  if (!normalized.includes("-----BEGIN PRIVATE KEY-----")) {
    normalized = `-----BEGIN PRIVATE KEY-----\n${normalized}`;
  }
  if (!normalized.includes("-----END PRIVATE KEY-----")) {
    normalized = `${normalized}\n-----END PRIVATE KEY-----`;
  }
  return normalized;
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

    if (typeof window === "undefined") {
      console.warn(
        "[Firebase Admin] Service Account credentials not configured.\n" +
        "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables."
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
    // Dynamic import to prevent top-level ERR_REQUIRE_ESM failure on Vercel
    const { getAuth } = require("firebase-admin/auth");
    adminAuthInstance = getAuth(adminApp);
  } catch (e) {
    console.warn("[Firebase Admin] Auth module initialization skipped or caught:", e instanceof Error ? e.message : e);
  }
  try {
    const { getStorage } = require("firebase-admin/storage");
    adminStorageInstance = getStorage(adminApp);
  } catch (e) {
    console.warn("[Firebase Admin] Storage module initialization skipped or caught:", e instanceof Error ? e.message : e);
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



