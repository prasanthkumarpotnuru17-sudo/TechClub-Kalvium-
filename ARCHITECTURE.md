# Tech Club Platform Architecture

## Overview
The Tech Club Platform is a Next.js (App Router) application built on top of Firebase (Firestore, Storage, Authentication). It is designed to be highly secure, modular, and scalable, suitable for deployment in an enterprise or college environment.

## Security & Permissions (`src/lib/permissions.ts`)
Role-based access control (RBAC) is tightly coupled with both the frontend UI and the Firebase Security Rules (`firestore.rules`). 

### Core Roles
- `super_admin`: Full access to the platform (including permanent deletions).
- `admin`: Standard event management, but cannot permanently delete events or manage global roles.
- `coordinator`: Limited access (cannot manually add participants, import CSV, or delete events).
- `member`: Standard authenticated user.

### Firebase Rules (`firestore.rules`)
All database rules are authenticated using token claims and the `team_access` collection.
- `isSuperAdminOrAdmin()`: Strict helper function to ensure that only `super_admin` or `admin` can mutate critical collections like `registrations` or `events`.

## Backend Processes (API Routes)
Client-side mutations are unsafe for cascading deletes and concurrent capacity updates. Thus, Next.js API Routes (using `firebase-admin`) handle critical operations:
1. **Cascade Event Deletion (`/api/admin/events/[id]`)**: Atomically deletes an event, its registrations, attendance, certificates, queued notifications, and triggers Storage cleanup.
2. **Transactional Registrations (`/api/admin/registrations`)**: Safely updates event capacity, manages the registration counter (`TCM-YYYY-0000`), prevents duplicate entries, and manages waitlist auto-promotions using Firestore Transactions.

## Data Schema & Lifecycles
### Events (`events` collection)
- **Status Lifecycle**: `Draft` → `Published` → `Completed` → `Archived` → `Deleted`.

### Registrations (`registrations` collection)
- **Status Lifecycle**: `Pending` → `Confirmed` (or `Waitlist`) → `Cancelled` → `Checked In` → `Attended`.
- **Soft Deletion**: When an admin removes a participant, they are soft-deleted (`isDeleted = true`, `status = "Cancelled"`).
- **Auto-Promotion**: Waitlisted students are automatically promoted to `Confirmed` if capacity opens up.

### Activity Logs (`activity_logs` collection)
Every administrative action (create event, import CSV, change roles) logs:
- `action`, `performedBy`, `userRole`, `targetType`, `targetId`, and a timestamp.

## CSV Imports
The system supports bulk CSV participant imports, gracefully validating duplicates and bypass capacity (if overridden), generating an error report CSV for any failed rows.

## Notifications
Notifications are queued into `notifications_queue` to allow external tools (like n8n or Cloud Functions) to asynchronously dispatch emails, Slack messages, or Discord alerts, ensuring the frontend never blocks on third-party API latency.

## Deployment Configuration
- Firebase Admin setup requires: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in environment variables.
- Required composite indexes are defined in `firestore.indexes.json` and must be deployed via `firebase deploy --only firestore:indexes`.
