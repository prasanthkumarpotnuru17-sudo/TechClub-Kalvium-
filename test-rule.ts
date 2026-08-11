import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import * as fs from "fs";

async function run() {
  console.log("Initializing Security Rules Test Environment...");
  const testEnv = await initializeTestEnvironment({
    projectId: "demo-test-project",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    }
  });

  // Setup seed data with security rules disabled
  console.log("Seeding test database records...");
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    
    // Seed team_access roles
    await setDoc(doc(db, "team_access", "superadmin@techclub.com"), {
      role: "super_admin",
      status: "active"
    });
    await setDoc(doc(db, "team_access", "admin@techclub.com"), {
      role: "admin",
      status: "active"
    });
    await setDoc(doc(db, "team_access", "coordinator@techclub.com"), {
      role: "coordinator",
      status: "active"
    });

    // Seed users profiles
    await setDoc(doc(db, "users", "uid-superadmin"), {
      email: "superadmin@techclub.com",
    });
    await setDoc(doc(db, "users", "uid-admin"), {
      email: "admin@techclub.com",
    });
    await setDoc(doc(db, "users", "uid-coordinator"), {
      email: "coordinator@techclub.com",
    });
    await setDoc(doc(db, "users", "uid-member"), {
      email: "member@techclub.com",
      isTechClubMember: true // Official Club Member (no admin role)
    });
    await setDoc(doc(db, "users", "uid-student"), {
      email: "student@techclub.com",
      isTechClubMember: false
    });

    // Seed a chat message owned by admin
    await setDoc(doc(db, "community_chats", "msg-admin-1"), {
      senderId: "uid-admin",
      senderEmail: "admin@techclub.com",
      message: "Hello leadership team!",
      type: "text",
      isDeleted: false
    });
  });

  // Get contexts
  const superAdminDb = testEnv.authenticatedContext("uid-superadmin", { email: "superadmin@techclub.com" }).firestore();
  const adminDb = testEnv.authenticatedContext("uid-admin", { email: "admin@techclub.com" }).firestore();
  const coordinatorDb = testEnv.authenticatedContext("uid-coordinator", { email: "coordinator@techclub.com" }).firestore();
  const memberDb = testEnv.authenticatedContext("uid-member", { email: "member@techclub.com" }).firestore();
  const studentDb = testEnv.authenticatedContext("uid-student", { email: "student@techclub.com" }).firestore();
  const unauthDb = testEnv.unauthenticatedContext().firestore();

  let failedTests = 0;
  let passedTests = 0;

  async function test(name: string, p: Promise<any>, shouldSucceed: boolean) {
    try {
      if (shouldSucceed) {
        await assertSucceeds(p);
      } else {
        await assertFails(p);
      }
      console.log(`[PASS] ${name}`);
      passedTests++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err);
      failedTests++;
    }
  }

  console.log("\n=== RUNNING SECURITY TESTS ===\n");

  // 1. User/Profile Deletion Checks
  await test("Super Admin -> delete user -> ALLOW", deleteDoc(doc(superAdminDb, "users", "uid-student")), true);
  await test("Admin -> delete user -> DENY", deleteDoc(doc(adminDb, "users", "uid-student")), false);
  await test("Coordinator -> delete user -> DENY", deleteDoc(doc(coordinatorDb, "users", "uid-student")), false);
  await test("Member -> delete user -> DENY", deleteDoc(doc(memberDb, "users", "uid-student")), false);

  await test("Super Admin -> delete profile -> ALLOW", deleteDoc(doc(superAdminDb, "profiles", "uid-student")), true);
  await test("Admin -> delete profile -> DENY", deleteDoc(doc(adminDb, "profiles", "uid-student")), false);

  // 2. Chat Read Checks
  await test("Super Admin -> read chat -> ALLOW", getDoc(doc(superAdminDb, "community_chats", "msg-admin-1")), true);
  await test("Admin -> read chat -> ALLOW", getDoc(doc(adminDb, "community_chats", "msg-admin-1")), true);
  await test("Coordinator -> read chat -> ALLOW", getDoc(doc(coordinatorDb, "community_chats", "msg-admin-1")), true);
  
  // NEW: Official member must be DENIED chat read access
  await test("Official Tech Club Member -> read chat -> DENY", getDoc(doc(memberDb, "community_chats", "msg-admin-1")), false);
  await test("Normal Student -> read chat -> DENY", getDoc(doc(studentDb, "community_chats", "msg-admin-1")), false);
  await test("Unauthenticated -> read chat -> DENY", getDoc(doc(unauthDb, "community_chats", "msg-admin-1")), false);

  // 3. Chat Create Checks (Sender alignment and task restriction)
  await test("Admin -> create text message -> ALLOW", setDoc(doc(adminDb, "community_chats", "msg-new-admin"), {
    senderId: "uid-admin",
    senderEmail: "admin@techclub.com",
    message: "Text from admin",
    type: "text",
    isDeleted: false
  }), true);

  // NEW: Official member must be DENIED chat write access
  await test("Official Tech Club Member -> create text message -> DENY", setDoc(doc(memberDb, "community_chats", "msg-new-member"), {
    senderId: "uid-member",
    senderEmail: "member@techclub.com",
    message: "Text from member",
    type: "text",
    isDeleted: false
  }), false);

  await test("Admin -> create task -> DENY", setDoc(doc(adminDb, "community_chats", "msg-task-admin"), {
    senderId: "uid-admin",
    senderEmail: "admin@techclub.com",
    message: "Task from admin",
    type: "task",
    isDeleted: false
  }), false);

  await test("Coordinator -> create task -> DENY", setDoc(doc(coordinatorDb, "community_chats", "msg-task-coord"), {
    senderId: "uid-coordinator",
    senderEmail: "coordinator@techclub.com",
    message: "Task from coord",
    type: "task",
    isDeleted: false
  }), false);

  await test("Super Admin -> create task -> ALLOW", setDoc(doc(superAdminDb, "community_chats", "msg-task-sa"), {
    senderId: "uid-superadmin",
    senderEmail: "superadmin@techclub.com",
    message: "Task from superadmin",
    type: "task",
    isDeleted: false
  }), true);

  // 4. Message Identity Spoofing Checks
  await test("Admin -> create message spoofing senderId -> DENY", setDoc(doc(adminDb, "community_chats", "msg-spoof-id"), {
    senderId: "uid-superadmin",
    senderEmail: "admin@techclub.com",
    message: "Spoofing ID",
    type: "text",
    isDeleted: false
  }), false);

  await test("Admin -> create message spoofing senderEmail -> DENY", setDoc(doc(adminDb, "community_chats", "msg-spoof-email"), {
    senderId: "uid-admin",
    senderEmail: "superadmin@techclub.com",
    message: "Spoofing Email",
    type: "text",
    isDeleted: false
  }), false);

  // 5. Message Update/Edit Restrictions
  await test("Admin -> update text message to task -> DENY", updateDoc(doc(adminDb, "community_chats", "msg-admin-1"), {
    type: "task"
  }), false);

  await test("Admin -> edit own message body -> DENY", updateDoc(doc(adminDb, "community_chats", "msg-admin-1"), {
    message: "Edited content"
  }), false);

  await test("Admin -> soft delete own message -> ALLOW", updateDoc(doc(adminDb, "community_chats", "msg-admin-1"), {
    isDeleted: true
  }), true);

  // 6. Message Deletion Checks
  await test("Admin -> delete own message -> ALLOW", deleteDoc(doc(adminDb, "community_chats", "msg-new-admin")), true);
  await test("Admin -> delete another message -> DENY", deleteDoc(doc(adminDb, "community_chats", "msg-task-sa")), false);
  await test("Coordinator -> delete another message -> DENY", deleteDoc(doc(coordinatorDb, "community_chats", "msg-task-sa")), false);
  await test("Super Admin -> delete another message -> ALLOW", deleteDoc(doc(superAdminDb, "community_chats", "msg-task-sa")), true);

  console.log(`\n=== TESTS COMPLETE: ${passedTests} passed, ${failedTests} failed ===\n`);
  await testEnv.cleanup();
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
