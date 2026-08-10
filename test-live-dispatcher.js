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

const webhookUrl = "https://prasanthkumarpotnuru17.app.n8n.cloud/webhook-test/techclub/notifications";

function generateCorrelationId() {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:T.Z]/g, "").substring(0, 14);
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `NTF-${dateStr}-${rand}`;
}

const NotificationType = {
  WELCOME: "WELCOME",
  EVENT_REGISTRATION: "EVENT_REGISTRATION",
  ATTENDANCE: "ATTENDANCE",
  REMINDER: "REMINDER",
  CERTIFICATE: "CERTIFICATE",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  CANCELLATION: "CANCELLATION",
};

async function sendNotification(notificationType, typeSlug, payloadData) {
  const correlationId = generateCorrelationId();
  const payload = {
    correlationId,
    type: typeSlug,
    notificationType: notificationType,
    ...payloadData
  };

  console.log(`\n==========================================================================`);
  console.log(`[Notification Dispatcher] DISPATCH TRIGGERED`);
  console.log(`[Notification Dispatcher] Correlation ID : ${correlationId}`);
  console.log(`[Notification Dispatcher] Notification Type: ${notificationType} (type: ${typeSlug})`);
  console.log(`[Notification Dispatcher] Target Webhook URL: ${webhookUrl}`);
  console.log(`[Notification Dispatcher] Payload Data :`, JSON.stringify(payload, null, 2));

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  console.log(`[Notification Dispatcher] n8n Response Status: ${response.status} ${response.statusText}`);
  console.log(`[Notification Dispatcher] n8n Response Body  : ${text.substring(0, 300)}`);
  console.log(`==========================================================================`);

  return {
    correlationId,
    notificationType,
    status: response.status,
    ok: response.ok,
    responseBody: text
  };
}

async function runAllTests() {
  console.log("==========================================================================");
  console.log("    LIVE END-TO-END NOTIFICATION VERIFICATION VIA MASTER DISPATCHER");
  console.log("==========================================================================");

  const testCases = [
    {
      notificationType: NotificationType.WELCOME,
      typeSlug: "welcome",
      data: {
        userId: "usr-test-welcome-001",
        email: "student.welcome@kalvium.community",
        name: "Welcome Student"
      }
    },
    {
      notificationType: NotificationType.EVENT_REGISTRATION,
      typeSlug: "event_registration",
      data: {
        userId: "usr-test-reg-002",
        registrationId: "TKT-REG-2026",
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
      notificationType: NotificationType.ATTENDANCE,
      typeSlug: "attendance_confirmation",
      data: {
        userId: "usr-test-att-003",
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
      notificationType: NotificationType.REMINDER,
      typeSlug: "event_reminder",
      data: {
        userId: "usr-test-rem-004",
        email: "student.reminder@kalvium.community",
        name: "Reminder Student",
        eventId: "evt-cyber-sec",
        event: {
          title: "Cyber Security Hackathon 2026",
          date: "Tomorrow at 09:00 AM IST",
          time: "09:00 AM IST",
          venue: "Lab 3"
        },
        button: { text: "Join Event", url: "https://tech-club-platform.firebaseapp.com/#events" }
      }
    },
    {
      notificationType: NotificationType.CERTIFICATE,
      typeSlug: "certificate",
      data: {
        userId: "usr-test-cert-005",
        email: "student.cert@kalvium.community",
        name: "Certificate Student",
        certificate: {
          eventName: "Cloud Computing Masterclass",
          issueDate: "2026-07-30",
          certificateNumber: "TC-2026-000999",
          verificationCode: "VERIFIED-CERT-999"
        },
        button: { text: "Download Certificate", url: "https://tech-club-platform.firebaseapp.com/profile" }
      }
    },
    {
      notificationType: NotificationType.CANCELLATION,
      typeSlug: "event_cancelled",
      data: {
        userId: "usr-test-cnc-006",
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
      notificationType: NotificationType.ANNOUNCEMENT,
      typeSlug: "announcement",
      data: {
        recipients: [
          { email: "student.announcement1@kalvium.community", name: "Announcement Student 1" },
          { email: "student.announcement2@kalvium.community", name: "Announcement Student 2" }
        ],
        announcement: {
          title: "Master Dispatcher Live Verification Announcement",
          message: "Testing unified n8n master dispatcher across all notification types live.",
          category: "General",
          priority: "High",
          publishedAt: new Date().toISOString()
        },
        button: { text: "Read Announcement", url: "https://tech-club-platform.firebaseapp.com/#announcements" }
      }
    }
  ];

  const summary = [];
  for (const tc of testCases) {
    const res = await sendNotification(tc.notificationType, tc.typeSlug, tc.data);
    summary.push({
      NotificationType: tc.notificationType,
      CorrelationID: res.correlationId,
      Status: res.status,
      Outcome: res.ok ? "SUCCESS (200 OK)" : `FAILED (${res.status})`
    });
  }

  console.log("\n==========================================================================");
  console.log("                     SUMMARY REPORT FOR ALL DISPATCHES");
  console.log("==========================================================================");
  console.table(summary);
}

runAllTests().catch(console.error);
