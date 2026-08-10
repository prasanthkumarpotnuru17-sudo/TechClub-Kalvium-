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

async function runVerification() {
  console.log("\n========================================================");
  console.log("=== EVENT REGISTRATION INTEGRITY & DUPLICATE TEST ===");
  console.log("========================================================\n");

  const { POST } = await import("./src/app/api/admin/registrations/route.ts");

  const testEventId = "evt-test-integrity-2026";
  const testUserId = "usr-student-456";
  const testEmail = "test.student@kalvium.community";
  const testName = "Test Student";

  // SCENARIO 1: Initial Registration Request
  console.log("[SCENARIO 1] Submitting initial registration request...");
  const req1 = new Request("http://localhost:3000/api/admin/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: testEventId,
      userId: testUserId,
      name: testName,
      email: testEmail,
      department: "CSE",
      year: "3rd Year",
      eventName: "Verification Hackathon 2026"
    })
  });

  const res1 = await POST(req1);
  const body1 = await res1.json();

  console.log(`[SCENARIO 1 RESPONSE STATUS] ${res1.status}`);
  console.log(`[SCENARIO 1 RESPONSE BODY]`, JSON.stringify(body1, null, 2));

  if (res1.status === 200 && body1.success) {
    console.log("✅ SCENARIO 1 PASSED: Initial registration created successfully.");
  } else {
    console.log("❌ SCENARIO 1 FAILED:", body1.message);
  }

  // SCENARIO 2: Duplicate Registration Attempt
  console.log("\n[SCENARIO 2] Submitting duplicate registration request for the same event & user...");
  const req2 = new Request("http://localhost:3000/api/admin/registrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: testEventId,
      userId: testUserId,
      name: testName,
      email: testEmail,
      department: "CSE",
      year: "3rd Year",
      eventName: "Verification Hackathon 2026"
    })
  });

  const res2 = await POST(req2);
  const body2 = await res2.json();

  console.log(`[SCENARIO 2 RESPONSE STATUS] ${res2.status}`);
  console.log(`[SCENARIO 2 RESPONSE BODY]`, JSON.stringify(body2, null, 2));

  if (res2.status === 409 && body2.code === "ALREADY_REGISTERED") {
    console.log("✅ SCENARIO 2 PASSED: HTTP 409 Conflict returned with code ALREADY_REGISTERED.");
  } else {
    console.log("❌ SCENARIO 2 FAILED: Expected HTTP 409 Conflict, received:", res2.status);
  }

  console.log("\n========================================================");
  console.log("=== END OF VERIFICATION TEST ===");
  console.log("========================================================\n");
}

runVerification().catch((err) => {
  console.error("Test execution error:", err);
});
