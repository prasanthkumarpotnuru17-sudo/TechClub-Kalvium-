import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdminSdkConfigured || !adminDb) {
    return NextResponse.json({
      members: 150,
      publishedEvents: 12,
      workshops: 20,
      certificates: 85,
      projectsCompleted: 25,
      hackathonsWon: 8,
    });
  }

  try {
    const [usersSnap, eventsSnap, certsSnap, projectsSnap] = await Promise.all([
      adminDb.collection("users").count().get(),
      adminDb.collection("events").where("status", "==", "Published").count().get(),
      adminDb.collection("certificates").count().get(),
      adminDb.collection("projects").count().get(),
    ]);

    return NextResponse.json({
      members: usersSnap.data()?.count || 150,
      publishedEvents: eventsSnap.data()?.count || 12,
      workshops: 20,
      certificates: certsSnap.data()?.count || 85,
      projectsCompleted: projectsSnap.data()?.count || 25,
      hackathonsWon: 8,
    });
  } catch (err) {
    return NextResponse.json({
      members: 150,
      publishedEvents: 12,
      workshops: 20,
      certificates: 85,
      projectsCompleted: 25,
      hackathonsWon: 8,
    });
  }
}
