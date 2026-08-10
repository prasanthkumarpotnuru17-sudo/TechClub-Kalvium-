import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { getDocs, collection } from "firebase/firestore";

export async function GET() {
  try {
    const events: any[] = [];
    if (isAdminSdkConfigured && adminDb) {
      const snap = await adminDb.collection("events").get();
      snap.forEach((d) => events.push({ id: d.id, ...d.data() }));
    } else {
      const snap = await getDocs(collection(clientDb, "events"));
      snap.forEach((d) => events.push({ id: d.id, ...d.data() }));
    }

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (err: any) {
    console.error("[API /api/events] GET Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch events", data: [] },
      { status: 500 }
    );
  }
}
