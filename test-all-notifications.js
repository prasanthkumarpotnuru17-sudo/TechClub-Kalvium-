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

async function runLiveNotificationTests() {
  console.log("==========================================================================");
  console.log("         END-TO-END LIVE NOTIFICATION DISPATCH TEST SUITE");
  console.log("==========================================================================");

  const { sendNotification } = await import("./src/lib/notificationDispatcher.ts");
  const { NotificationType } = await import("./src/types/notificationTypes.ts");

  const testPayloads = [
    {
      type: NotificationType.WELCOME,
      data: {
        userId: "test-user-001",
        email: "student.welcome@kalvium.community",
        name: "Welcome Student",
      }
    },
    {
      type: NotificationType.EVENT_REGISTRATION,
      data: {
        userId: "test-user-002",
        registrationId: "TKT-REG-1002",
        eventId: "evt-ai-bootcamp",
        email: "student.reg@kalvium.community",
        name: "Registration Student",
        event: {
          title: "AI & ML Hands-on Bootcamp 2026",
          date: "August 15, 2026",
          time: "10:00 AM IST",
          venue: "Kalvium Tech Auditorium"
        },
        button: { text: "View Ticket", url: "https://tech-club-platform.firebaseapp.com/profile/events" }
      }
    },
    {
      type: NotificationType.ATTENDANCE,
      data: {
        userId: "test-user-003",
        email: "student.attend@kalvium.community",
        name: "Attendance Student",
        event: {
          title: "Full-Stack Web Dev Workshop",
          date: "July 30, 2026"
        },
        button: { text: "View Attendance", url: "https://tech-club-platform.firebaseapp.com/profile" }
      }
    },
    {
      type: NotificationType.REMINDER,
      data: {
        userId: "test-user-004",
        email: "student.reminder@kalvium.community",
        name: "Reminder Student",
        eventId: "evt-cyber-security",
        event: {
          title: "Cyber Security Hackathon 2026",
          date: "Tomorrow at 09:00 AM",
          time: "09:00 AM IST",
          venue: "Lab 3"
        },
        button: { text: "Join Event", url: "https://tech-club-platform.firebaseapp.com/#events" }
      }
    },
    {
      type: NotificationType.CERTIFICATE,
      data: {
        userId: "test-user-005",
        email: "student.cert@kalvium.community",
        name: "Certificate Student",
        certificate: {
          eventName: "Cloud Computing Masterclass",
          issueDate: "2026-07-30",
          certificateNumber: "TC-2026-000888",
          verificationCode: "VERIFIED-CERT-888"
        },
        button: { text: "Download Certificate", url: "https://tech-club-platform.firebaseapp.com/profile" }
      }
    },
    {
      type: NotificationType.CANCELLATION,
      data: {
        userId: "test-user-006",
        email: "student.cancel@kalvium.community",
        name: "Cancelled Event Student",
        event: {
          title: "Outdoor Robotics Meetup",
          date: "August 01, 2026",
          reason: "Weather advisory & heavy rain forecast"
        }
      }
    },
    {
      type: NotificationType.ANNOUNCEMENT,
      data: {
        recipients: [
          { email: "student.announcement1@kalvium.community", name: "Announcement Student 1" },
          { email: "student.announcement2@kalvium.community", name: "Announcement Student 2" }
        ],
        announcement: {
          title: "Master Dispatcher Verification Announcement",
          message: "Testing unified n8n dispatcher across all notification types.",
          category: "General",
          priority: "High",
          publishedAt: new Date().toISOString()
        },
        button: { text: "Read Announcement", url: "https://tech-club-platform.firebaseapp.com/#announcements" }
      }
    }
  ];

  const results = [];

  for (const testItem of testPayloads) {
    console.log(`\n--------------------------------------------------------------------------`);
    console.log(`Testing Dispatch for Notification Type: ${testItem.type}`);
    console.log(`--------------------------------------------------------------------------`);

    try {
      const res = await sendNotification(testItem.type, testItem.data);
      results.push({
        type: testItem.type,
        correlationId: res.correlationId,
        success: res.success,
        httpStatus: res.httpStatus,
        webhookUrl: res.webhookUrl,
        attempts: res.attempts,
        error: res.error || "None"
      });
    } catch (err) {
      console.error(`Exception testing ${testItem.type}:`, err);
      results.push({
        type: testItem.type,
        correlationId: "FAILED",
        success: false,
        httpStatus: 500,
        error: err.message
      });
    }
  }

  console.log("\n==========================================================================");
  console.log("                  FINAL LIVE TEST RESULTS SUMMARY");
  console.log("==========================================================================");
  console.table(results);

  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log("\n✅ ALL NOTIFICATION TYPES SUCCESSFULLY REACHED THE N8N WEBHOOK!");
  } else {
    console.warn("\n⚠️ SOME NOTIFICATIONS FAILED TO DISPATCH. Check error table above.");
  }
}

runLiveNotificationTests().catch(err => console.error("Test Error:", err));
