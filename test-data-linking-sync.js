import fs from "fs";
import path from "path";

// Read and load .env.local into process.env
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const parts = trimmed.split("=");
      const key = parts[0]?.trim();
      const val = parts.slice(1).join("=").trim();
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}

async function runEnterpriseArchitectureTest() {
  console.log("\n========================================================");
  console.log("=== ENTERPRISE-GRADE REGISTRATION ARCHITECTURE TEST ===");
  console.log("========================================================\n");

  const { POST } = await import("./src/app/api/admin/registrations/route.ts");

  const testEventId = "evt-enterprise-2026";
  const testUserId = "usr-enterprise-student-100";
  const testEmail = "enterprise.student@kalvium.community";
  const testName = "Enterprise Architecture Student";

  // STEP 1: API Level Validation for Missing userId (HTTP 400 Bad Request)
  console.log("[TEST STEP 1] Testing HTTP 400 rejection when userId is missing for website registrations...");
  const invalidReq = new Request("http://localhost:3000/api/admin/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: testEventId,
      userId: "", // Missing/empty userId
      name: testName,
      email: testEmail,
      source: "website"
    })
  });

  const invalidRes = await POST(invalidReq);
  const invalidBody = await invalidRes.json();

  console.log(`[INVALID REQUEST STATUS] ${invalidRes.status}`);
  console.log(`[INVALID REQUEST BODY]`, JSON.stringify(invalidBody, null, 2));

  if (invalidRes.status === 400 && invalidBody.code === "USER_ID_REQUIRED") {
    console.log("✅ STEP 1 PASSED: HTTP 400 Bad Request returned with USER_ID_REQUIRED.");
  } else {
    throw new Error(`Expected HTTP 400 Bad Request with USER_ID_REQUIRED, received: ${invalidRes.status}`);
  }

  // STEP 2: Valid Registration Creation with eventSnapshot & registeredAt
  console.log("\n[TEST STEP 2] Executing valid registration with eventSnapshot & registeredAt...");
  const req = new Request("http://localhost:3000/api/admin/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: testEventId,
      userId: testUserId,
      name: testName,
      email: testEmail,
      department: "Cyber Security",
      year: "4th Year",
      eventName: "Enterprise Security Con 2026",
      eventDate: "Oct 12, 2026",
      eventTime: "11:00 AM",
      venue: "Grand Kalvium Auditorium",
      source: "website"
    })
  });

  const res = await POST(req);
  const body = await res.json();

  console.log(`[POST RESPONSE STATUS] ${res.status}`);
  console.log(`[POST RESPONSE BODY]`, JSON.stringify(body, null, 2));

  if (res.status !== 200 || !body.success) {
    throw new Error(`Registration failed: ${body.message}`);
  }

  const regData = body.data;
  console.log("✅ STEP 2 PASSED: Enterprise registration document created.");

  // STEP 3: Inspect eventSnapshot, registeredAt, updatedAt, source, and mandatory userId
  console.log("\n[TEST STEP 3] Verifying enterprise schema fields...");
  if (!regData.eventSnapshot || typeof regData.eventSnapshot !== "object") {
    throw new Error("Missing or invalid eventSnapshot object!");
  }

  if (regData.eventSnapshot.title !== "Enterprise Security Con 2026" || regData.eventSnapshot.venue !== "Grand Kalvium Auditorium") {
    throw new Error("eventSnapshot fields mismatch!");
  }

  if (!regData.registeredAt || !regData.updatedAt) {
    throw new Error("Missing registeredAt or updatedAt timestamps!");
  }

  if (regData.source !== "website") {
    throw new Error("Source field mismatch!");
  }

  console.log("✅ STEP 3 PASSED: All enterprise schema fields validated:");
  console.log(`   • eventSnapshot:`, JSON.stringify(regData.eventSnapshot));
  console.log(`   • registeredAt: ${regData.registeredAt}`);
  console.log(`   • updatedAt: ${regData.updatedAt}`);
  console.log(`   • source: ${regData.source}`);

  // STEP 4: Duplicate Registration Rejection Check (HTTP 409 Conflict)
  console.log("\n[TEST STEP 4] Testing duplicate registration rejection (HTTP 409 Conflict)...");
  const dupReq = new Request("http://localhost:3000/api/admin/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: testEventId,
      userId: testUserId,
      name: testName,
      email: testEmail,
      source: "website"
    })
  });

  const dupRes = await POST(dupReq);
  const dupBody = await dupRes.json();

  console.log(`[DUPLICATE RESPONSE STATUS] ${dupRes.status}`);
  console.log(`[DUPLICATE RESPONSE BODY]`, JSON.stringify(dupBody, null, 2));

  if (dupRes.status === 409 && dupBody.code === "ALREADY_REGISTERED") {
    console.log("✅ STEP 4 PASSED: HTTP 409 Conflict returned with code ALREADY_REGISTERED.");
  } else {
    throw new Error(`Expected HTTP 409 Conflict, received: ${dupRes.status}`);
  }

  console.log("\n========================================================");
  console.log("=== ALL ENTERPRISE ARCHITECTURE TESTS PASSED 100% ===");
  console.log("========================================================\n");
}

runEnterpriseArchitectureTest().catch((err) => {
  console.error("Test execution failed:", err);
});
