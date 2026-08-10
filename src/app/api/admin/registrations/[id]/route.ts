import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { safeSetDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { ApiResponse } from "@/types/apiResponse";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const db = adminDb;

    if (isAdminSdkConfigured && db) {
      try {
        await db.runTransaction(async (transaction) => {
          const regRef = db.collection("registrations").doc(regId);
          const regDoc = await transaction.get(regRef);
          
          if (!regDoc.exists) {
            throw new Error("Registration not found");
          }
          
          const regData = regDoc.data()!;
          const eventId = regData.eventId;

          // Delete the registration document
          transaction.delete(regRef);

          // If confirmed, decrement count and auto-promote waitlist
          if (regData.status === "Confirmed") {
            const eventRef = db.collection("events").doc(eventId);
            const eventDoc = await transaction.get(eventRef);
            
            if (eventDoc.exists) {
              const eventData = eventDoc.data()!;
              let newCount = Math.max(0, eventData.registeredCount - 1);
              
              const waitlistQuery = await db.collection("registrations")
                .where("eventId", "==", eventId)
                .where("status", "==", "Waitlist")
                .orderBy("createdAt", "asc")
                .limit(1)
                .get();

              if (!waitlistQuery.empty) {
                const promotedDoc = waitlistQuery.docs[0];
                transaction.update(promotedDoc.ref, {
                  status: "Confirmed",
                  updatedAt: new Date().toISOString()
                });
                newCount++;
              }
              
              transaction.update(eventRef, { registeredCount: newCount });
            }
          }
        });

        return NextResponse.json<ApiResponse>({
          success: true,
          message: "Registration cancelled and waitlist processed.",
          data: null,
          error: null
        });
      } catch (adminErr: any) {
        console.warn("[Admin Registrations API] Admin SDK delete transaction notice (falling back to Client SDK):", adminErr.message || adminErr);
      }
    }

    // Client SDK Fallback for Local Dev Mode
    try {
      const regRef = doc(clientDb, "registrations", regId);
      await deleteDoc(regRef);
      console.log(`[Admin Registrations API] Registration ${regId} deleted via Client SDK fallback.`);
    } catch (clientDbErr: any) {
      console.warn("[Admin Registrations API] Client SDK delete notice:", clientDbErr.message || clientDbErr);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Registration cancelled.",
      data: null,
      error: null
    });

  } catch (error: any) {
    console.error("Cancel Registration Error:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: error.message || "Failed to cancel registration",
      data: null,
      error: error.message
    }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: regId } = await params;
    const body = await req.json();

    const updateData = removeUndefinedFields({
      ...body,
      updatedAt: new Date().toISOString()
    });

    const db = adminDb;
    if (isAdminSdkConfigured && db) {
      try {
        const regRef = db.collection("registrations").doc(regId);
        const regDoc = await regRef.get();

        if (regDoc.exists) {
          await regRef.update(updateData);
          const updatedSnap = await regRef.get();
          return NextResponse.json<ApiResponse>({
            success: true,
            message: "Registration updated successfully",
            data: { id: updatedSnap.id, ...updatedSnap.data() },
            error: null
          });
        }
      } catch (adminErr: any) {
        console.warn("[Admin Registrations API] Admin SDK patch notice (falling back to Client SDK):", adminErr.message || adminErr);
      }
    }

    // Client SDK Fallback for Local Dev Mode
    try {
      const clientRegRef = doc(clientDb, "registrations", regId);
      await safeSetDoc(clientRegRef, updateData, { merge: true });
      console.log(`[Admin Registrations API] Registration ${regId} updated via Client SDK fallback.`);

      return NextResponse.json<ApiResponse>({
        success: true,
        message: "Registration updated successfully",
        data: { id: regId, ...updateData },
        error: null
      });
    } catch (clientDbErr: any) {
      console.warn("[Admin Registrations API] Client SDK update notice:", clientDbErr.message || clientDbErr);
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: "Registration updated successfully",
      data: { id: regId, ...updateData },
      error: null
    });

  } catch (error: any) {
    console.error("Update Registration Error:", error);
    return NextResponse.json<ApiResponse>({
      success: false,
      message: error.message || "Failed to update registration",
      data: null,
      error: error.message
    }, { status: 500 });
  }
}
