import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { getDocs, collection, query, where } from "firebase/firestore";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "";
    const email = (searchParams.get("email") || "").toLowerCase().trim();

    if (!userId && !email) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const itemsMap = new Map<string, any>();

    // 1. Admin SDK Query (bypasses security rules to reliably get user registrations)
    if (isAdminSdkConfigured && adminDb) {
      try {
        if (userId) {
          const snapUid = await adminDb
            .collection("registrations")
            .where("userId", "==", userId)
            .get();
          snapUid.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() }));
        }

        if (email) {
          const snapEmail = await adminDb
            .collection("registrations")
            .where("email", "==", email)
            .get();
          snapEmail.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() }));
        }
      } catch (adminErr: any) {
        console.warn("[API /api/user/registrations] Admin SDK GET notice:", adminErr?.message || adminErr);
      }
    }

    // 2. Client SDK fallback if Admin SDK didn't run or yielded no results
    if (itemsMap.size === 0) {
      try {
        if (userId) {
          const qUid = query(collection(clientDb, "registrations"), where("userId", "==", userId));
          const snapUid = await getDocs(qUid);
          snapUid.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() }));
        }

        if (email) {
          const qEmail = query(collection(clientDb, "registrations"), where("email", "==", email));
          const snapEmail = await getDocs(qEmail);
          snapEmail.forEach((d) => itemsMap.set(d.id, { id: d.id, ...d.data() }));
        }
      } catch (clientErr: any) {
        console.warn("[API /api/user/registrations] Client SDK GET notice:", clientErr?.message || clientErr);
      }
    }

    const userRegs = Array.from(itemsMap.values()).filter(
      (r) => !r.deleted && !r.isDeleted
    );

    return NextResponse.json({
      success: true,
      data: userRegs,
    });
  } catch (err: any) {
    console.error("[API /api/user/registrations] GET Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch user registrations", data: [] },
      { status: 500 }
    );
  }
}
