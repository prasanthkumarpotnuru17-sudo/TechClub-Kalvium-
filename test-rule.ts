import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import * as fs from "fs";

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-test-project",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    }
  });

  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "team_access", "prasanthkumarpotnuru17@gmail.com"), {
      role: "super_admin",
      status: "active"
    });
  });

  const db = testEnv.authenticatedContext("my-uid", {
    email: "prasanthkumarpotnuru17@gmail.com"
  }).firestore();

  try {
    const docSnap = await getDoc(doc(db, "team_access", "prasanthkumarpotnuru17@gmail.com"));
    console.log("Read success:", docSnap.exists());
  } catch (err) {
    console.error("Read failed:", err);
  }

  await testEnv.cleanup();
}
run();
