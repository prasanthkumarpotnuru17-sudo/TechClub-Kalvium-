import { 
  DocumentReference, 
  setDoc, 
  updateDoc, 
  SetOptions 
} from "firebase/firestore";

/**
 * Recursively removes all keys with `undefined` values from an object or array.
 * Preserves `null`, `false`, `0`, `""`, `[]`, and `{}`.
 * In development, logs removed fields for debugging.
 */
export function removeUndefinedFields<T>(
  data: T, 
  docPath: string = "unknown_doc", 
  currentPath: string = ""
): T {
  if (data === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[Firestore Sanitizer] Removed undefined value at root (${docPath})`);
    }
    return undefined as unknown as T;
  }

  if (data === null || typeof data !== "object") {
    return data;
  }

  // Preserve Date instances
  if (data instanceof Date) {
    return data as unknown as T;
  }

  // Handle Arrays
  if (Array.isArray(data)) {
    const sanitizedArray = data
      .map((item, idx) => 
        removeUndefinedFields(item, docPath, currentPath ? `${currentPath}[${idx}]` : `[${idx}]`)
      )
      .filter((item) => item !== undefined);

    return sanitizedArray as unknown as T;
  }

  // Handle Objects
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    const fieldPath = currentPath ? `${currentPath}.${key}` : key;

    if (value === undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Firestore Sanitizer] Removed undefined field: ${fieldPath} (${docPath})`);
      }
      // Omit property from result object
    } else if (typeof value === "object" && value !== null && !(value instanceof Date) && !Array.isArray(value)) {
      // Recursively sanitize nested object
      const sanitizedObj = removeUndefinedFields(value, docPath, fieldPath);
      result[key] = sanitizedObj;
    } else if (Array.isArray(value)) {
      // Recursively sanitize array items
      const sanitizedArr = removeUndefinedFields(value, docPath, fieldPath);
      result[key] = sanitizedArr;
    } else {
      // Retain primitive values (null, false, 0, "", string, number, boolean)
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Safely writes a document to Firestore using setDoc with automatic `undefined` field removal.
 * Defaults to `{ merge: true }` to preserve existing fields unless options are explicitly provided.
 */
export async function safeSetDoc(
  docRef: DocumentReference,
  data: any,
  options: SetOptions = { merge: true }
): Promise<void> {
  const sanitizedData = removeUndefinedFields(data, docRef.path);
  await setDoc(docRef, sanitizedData, options);
}

/**
 * Safely updates an existing document in Firestore using updateDoc with automatic `undefined` field removal.
 */
export async function safeUpdateDoc(
  docRef: DocumentReference,
  data: any
): Promise<void> {
  const sanitizedData = removeUndefinedFields(data, docRef.path);
  await updateDoc(docRef, sanitizedData);
}
