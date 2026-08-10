import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { ApiResponse } from "@/types/apiResponse";

export async function POST(req: Request) {
  return await processAutomatedReminders();
}

export async function GET(req: Request) {
  return await processAutomatedReminders();
}

async function processAutomatedReminders() {
  try {
    let events: any[] = [];

    if (adminDb) {
      const snap = await adminDb.collection("events")
        .where("status", "==", "Published")
        .get();

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.reminders?.enabled && Array.isArray(data.reminders?.schedules) && data.reminders.schedules.length > 0) {
          events.push({ id: docSnap.id, ...data });
        }
      });
    } else {
      const { db } = await import("@/lib/firebase");
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const q = query(
        collection(db, "events"),
        where("status", "==", "Published")
      );
      const snap = await getDocs(q);
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.reminders?.enabled && Array.isArray(data.reminders?.schedules) && data.reminders.schedules.length > 0) {
          events.push({ id: docSnap.id, ...data });
        }
      });
    }

    const now = new Date();
    const results: any[] = [];

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tech-club-platform.firebaseapp.com");

    const sendApiUrl = `${baseUrl}/api/reminders/send`;

    for (const evt of events) {
      if (!evt.date) continue;
      
      const eventDate = new Date(evt.date);
      if (isNaN(eventDate.getTime())) continue;

      const diffMs = eventDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      const schedules: string[] = evt.reminders.schedules;
      const sentSchedules: string[] = evt.reminders.sentSchedules || [];

      let dueSchedule: string | null = null;

      if (schedules.includes("2_days") && diffHours > 36 && diffHours <= 48 && !sentSchedules.includes("2_days")) {
        dueSchedule = "2_days";
      } else if (schedules.includes("1_day") && diffHours > 18 && diffHours <= 24 && !sentSchedules.includes("1_day")) {
        dueSchedule = "1_day";
      } else if (schedules.includes("1_hour") && diffHours > 0 && diffHours <= 1.5 && !sentSchedules.includes("1_hour")) {
        dueSchedule = "1_hour";
      }

      if (dueSchedule) {
        try {
          const res = await fetch(sendApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: evt.id, schedule: dueSchedule })
          });
          const resData = await res.json();
          
          if (adminDb) {
            await adminDb.collection("events").doc(evt.id).update({
              "reminders.sentSchedules": [...sentSchedules, dueSchedule],
              "reminders.lastAutoSentAt": new Date().toISOString()
            }).catch(() => {});
          }

          results.push({
            eventId: evt.id,
            title: evt.title,
            triggeredSchedule: dueSchedule,
            status: resData.success ? "SUCCESS" : "FAILED",
            details: resData
          });
        } catch (err: any) {
          results.push({
            eventId: evt.id,
            title: evt.title,
            triggeredSchedule: dueSchedule,
            status: "ERROR",
            error: err.message
          });
        }
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: `Automated reminder check completed. Processed ${results.length} due reminder(s).`,
      data: {
        totalEvaluatedEvents: events.length,
        triggeredRemindersCount: results.length,
        results
      },
      error: null
    });

  } catch (error: any) {
    console.error("Error in /api/reminders/process:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: "AUTOMATED_REMINDER_PROCESS_ERROR",
      data: null,
      error: error.message
    }, { status: 500 });
  }
}
