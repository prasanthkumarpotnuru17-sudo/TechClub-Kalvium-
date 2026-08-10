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

async function main() {
  const { POST } = await import("./src/app/api/notifications/announcement/route");

  console.log("=== RUNTIME EXECUTION TEST WITH CLIENT RECIPIENTS ===");

  const sampleRecipients = [
    { email: "superadmin@kalvium.community", fullName: "Super Admin", accountStatus: "active", role: "super_admin" },
    { email: "admin@kalvium.community", fullName: "Club Admin", accountStatus: "active", role: "admin" },
    { email: "coordinator@kalvium.community", fullName: "Event Coordinator", accountStatus: "active", role: "coordinator" },
    { email: "lead@kalvium.community", fullName: "Tech Lead", accountStatus: "active", role: "member" },
    { email: "volunteer@kalvium.community", fullName: "Student Volunteer", accountStatus: "active", role: "member" },
    { email: "rahul.sharma@kalvium.community", fullName: "Rahul Sharma", accountStatus: "active", role: "member" },
    { email: "priya.patel@kalvium.community", fullName: "Priya Patel", accountStatus: "active", role: "member" },
    { email: "ananya.singh@kalvium.community", fullName: "Ananya Singh", accountStatus: "active", role: "member" },
    { email: "vikram.verma@kalvium.community", fullName: "Vikram Verma", accountStatus: "active", role: "member" },
    { email: "rohit.kumar@kalvium.community", fullName: "Rohit Kumar", accountStatus: "active", role: "member" },
    { email: "neha.gupta@kalvium.community", fullName: "Neha Gupta", accountStatus: "active", role: "member" }
  ];

  const mockReq = new Request("http://localhost:3000/api/notifications/announcement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      announcementId: "ann-runtime-test",
      announcement: {
        title: "Live Runtime Verification Announcement",
        message: "Verifying exact live execution and recipient filtering with actual Firestore database.",
        category: "General",
        priority: "Normal",
        date: new Date().toISOString()
      },
      recipients: sampleRecipients
    })
  });

  const response = await POST(mockReq);
  const jsonResult = await response.json();

  console.log("=== API ROUTE RESPONSE STATUS ===", response.status);
  console.log("=== API ROUTE RESPONSE BODY ===", JSON.stringify(jsonResult, null, 2));
  console.log("=== RUNTIME EXECUTION LOG END ===");
}

main().catch((err) => {
  console.error("=== RUNTIME ERROR ===", err);
});
