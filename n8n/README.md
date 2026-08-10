# Master Notification Workflow — n8n Engine

This directory contains the production-ready **n8n Master Notification Workflow**, designed for centralized, event-driven notification dispatching across the Kalvium Tech Club Platform.

---

## 🌟 Key Architecture Highlights

1. **Single Entry Webhook Route**: Rather than fragmenting into multiple workflows, all notification requests flow through a single Webhook endpoint (`POST /webhook/notifications/master`) via Next.js API entry point `/api/notifications/dispatch`.
2. **Conditional Routing (`Switch` Node)**: Routes payloads based on `notificationType` (`WELCOME`, `EVENT_REGISTRATION`, and extensible slots for `REMINDER`, `CERTIFICATE`, `ANNOUNCEMENT`).
3. **Minimal Identifiers Payload**: Webhook receives ONLY IDs (`notificationId`, `notificationType`, `userId`, `registrationId`, `eventId`). The workflow dynamically fetches complete student and event records from Firestore.
4. **Strict Deduplication**:
   - `WELCOME`: Checks `welcomeEmailSent` in `users/{userId}`.
   - `EVENT_REGISTRATION`: Checks `confirmationEmailSent` in `registrations/{registrationId}`.
   - Skips duplicate execution and logs `DUPLICATE_SKIPPED` status.
5. **Auditing (`notification_logs` collection)**:
   - Tracks `notificationId`, `notificationType`, `recipient`, `provider` (`"n8n_smtp"`), `attemptCount`, `status` (`PENDING`, `SUCCESS`, `FAILED`, `DUPLICATE_SKIPPED`), `timestamps` (`createdAt`, `updatedAt`, `sentAt`), and `errorDetails`.
6. **Automatic Email Retries**: Email nodes are configured with automatic retries (**3 attempts**, 5-second backoff) on temporary SMTP failures.
7. **Reusable HTML Email Templates**: Stored cleanly in `n8n/templates/` (`welcome.html` and `event_registration.html`).

---

## 📦 File Overview

```
n8n/
├── master-notification-workflow.json   # Exported n8n workflow definition
├── README.md                           # Documentation & Deployment guide
└── templates/                          # Reusable HTML email templates
    ├── welcome.html                    # Welcome email template
    └── event_registration.html         # Event confirmation template
```

---

## 🚀 How to Import & Setup in n8n

### Step 1: Import Workflow JSON into n8n
1. Open your n8n Dashboard (e.g. `http://localhost:5678` or hosted instance).
2. Click **Workflows** → **Import from File**.
3. Select `n8n/master-notification-workflow.json`.

### Step 2: Configure Credentials in n8n
1. **Google Firestore Credential**:
   - In n8n, go to **Credentials** → **New**.
   - Select **Google Firestore OAuth2 / Service Account**.
   - Paste your Firebase Service Account JSON credentials (matching `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).
2. **SMTP Credential**:
   - Select **SMTP**.
   - Enter your email service credentials (e.g. Gmail App Password, SendGrid SMTP, Mailgun).

### Step 3: Set Environment Variables in `.env.local`
Add the following to your Next.js project `.env.local`:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook/notifications/master
N8N_WEBHOOK_SECRET=your_secure_random_token_here
```

---

## 📩 Webhook Payload Schema & API Usage

### Next.js API Entry Point
Trigger notifications by posting to `/api/notifications/dispatch` or calling `n8nNotificationService`:

```ts
import { n8nNotificationService } from "@/lib/services/n8nNotificationService";

// 1. Welcome Email (First Login)
await n8nNotificationService.dispatchWelcomeEmail("user_uid_123");

// 2. Event Registration Confirmation
await n8nNotificationService.dispatchEventRegistrationConfirmation(
  "reg_17745678", // registrationId
  "evt_17745678", // eventId
  "user_uid_123"  // userId
);
```

### Raw Webhook Payload Format (n8n Webhook Input)
```json
{
  "notificationId": "notif-1774567890-a1b2c3",
  "notificationType": "EVENT_REGISTRATION",
  "userId": "usr-123",
  "registrationId": "reg-456",
  "eventId": "evt-789"
}
```

---

## 🔄 Adding New Notification Types

To introduce a new notification type (e.g. `CERTIFICATE` or `ANNOUNCEMENT`):

1. **Add Output Rule in Switch Node**:
   - Open node `Route Notification Type`.
   - Add condition: `notificationType EQUALS "YOUR_NEW_TYPE"`.
2. **Connect Branch**:
   - Connect the output branch to Firestore fetch node / HTML template email node.
3. **Trigger from Service**:
   - Call `n8nNotificationService.dispatchNotification({ notificationType: "YOUR_NEW_TYPE", ... })`.

---

## 📊 Extended `notification_logs` Schema (Firestore)

Each notification creates and updates a record in `notification_logs/{notificationId}`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `notificationId` | String | Unique tracking ID (`notif-TIMESTAMP-RANDOM`) |
| `notificationType` | String | `"WELCOME"` \| `"EVENT_REGISTRATION"` \| `"REMINDER"` \| etc. |
| `recipient` | String | Target student email address |
| `provider` | String | Email delivery provider (`"n8n_smtp"`) |
| `attemptCount` | Number | Number of delivery attempts made (up to 3) |
| `status` | String | `"PENDING"` \| `"SUCCESS"` \| `"FAILED"` \| `"DUPLICATE_SKIPPED"` |
| `timestamps` | Object | `{ createdAt: ISO, updatedAt: ISO, sentAt: ISO \| null }` |
| `errorDetails` | String \| null | Exception stack trace or skip rationale |
