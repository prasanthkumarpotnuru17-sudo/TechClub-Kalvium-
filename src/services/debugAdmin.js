const fs = require("fs");
const path = require("path");
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

// Parse .env.local
const envPath = path.join(__dirname, "../../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const config = {};
envContent.split("\n").forEach(line => {
  const parts = line.split("=");
  if (parts.length === 2) {
    config[parts[0].trim()] = parts[1].trim();
  }
});

const firebaseConfig = {
  apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const email = "prasanthkumarpotnuru17@gmail.com";
  console.log(`Debugging Firestore lookup for: ${email}`);
  
  const docRef = doc(db, "team_access", email);
  console.log(`Document path: team_access/${email}`);
  
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log("Document EXISTS!");
      console.log("Raw Data:", docSnap.data());
    } else {
      console.log("Document DOES NOT exist in collection team_access.");
    }
  } catch (error) {
    console.error("Error reading document from Firestore:", error);
  }
}

main().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
