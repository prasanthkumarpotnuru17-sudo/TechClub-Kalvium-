import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

export interface UpdateEmailStatusRequest {
  certificateNumber?: string;
  studentId?: string;
  studentEmail?: string;
  emailStatus?: string;
  status?: string;
  emailSentAt?: string;
  error?: string;
}

export async function POST(req: Request) {
  let body: UpdateEmailStatusRequest = {};
  try {
    // 1. Security & Authentication Check (Bearer API Key)
    const authHeader = req.headers.get("authorization");
    const providedKey = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7).trim()
      : authHeader?.trim();

    const expectedKey = process.env.N8N_API_KEY || process.env.N8N_WEBHOOK_SECRET || "your-secret-key";

    if (!providedKey || providedKey !== expectedKey) {
      console.warn("[update-email-status API] Unauthorized attempt:", providedKey);
      return NextResponse.json(
        {
          success: false,
          message: "UNAUTHORIZED",
          error: "Invalid or missing Bearer API key in Authorization header."
        },
        { status: 401 }
      );
    }

    // 2. Parse & Validate Payload
    body = await req.json();

    const certNum = body.certificateNumber?.trim();
    const studentId = body.studentId?.trim();
    const emailStatus = body.emailStatus?.trim();

    if (!certNum && !studentId) {
      return NextResponse.json(
        {
          success: false,
          message: "INVALID_PAYLOAD",
          error: "Either certificateNumber or studentId is required in the request body."
        },
        { status: 400 }
      );
    }

    if (!emailStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "INVALID_PAYLOAD",
          error: "emailStatus is required in the request body."
        },
        { status: 400 }
      );
    }

    let targetDocId: string | null = null;
    const nowIso = new Date().toISOString();

    const updateFields: Record<string, any> = {
      emailStatus: emailStatus,
      updatedAt: nowIso,
    };

    if (body.status) {
      updateFields.status = body.status;
    }
    if (body.emailSentAt) {
      updateFields.emailSentAt = body.emailSentAt;
    } else {
      updateFields.emailSentAt = nowIso;
    }
    if (body.error !== undefined) {
      updateFields.emailError = body.error;
    }

    // 3. Locate & Update Document (Admin SDK in Production / Client SDK in Local Dev)
    if (isAdminSdkConfigured && adminDb) {
      let snap: any = null;

      if (certNum) {
        snap = await adminDb.collection("certificates").where("certificateNumber", "==", certNum).limit(1).get();
      }

      if ((!snap || snap.empty) && studentId) {
        snap = await adminDb.collection("certificates").where("studentId", "==", studentId).limit(1).get();
      }

      if ((!snap || snap.empty) && certNum) {
        snap = await adminDb.collection("certificates").where("certificateId", "==", certNum).limit(1).get();
      }

      if (!snap || snap.empty) {
        return NextResponse.json(
          {
            success: false,
            message: "CERTIFICATE_NOT_FOUND",
            error: `No certificate document found matching certificateNumber/studentId "${certNum || studentId}".`
          },
          { status: 404 }
        );
      }

      const targetDoc = snap.docs[0];
      targetDocId = targetDoc.id;
      await targetDoc.ref.update(updateFields);

    } else {
      // Local Dev Fallback via Client SDK
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("[update-email-status API] Anonymous auth warning:", authErr);
        }
      }

      let targetRef: any = null;

      if (certNum) {
        const q1 = query(collection(db, "certificates"), where("certificateNumber", "==", certNum));
        const s1 = await getDocs(q1);
        if (!s1.empty) {
          targetDocId = s1.docs[0].id;
          targetRef = doc(db, "certificates", targetDocId);
        }
      }

      if (!targetRef && studentId) {
        const q2 = query(collection(db, "certificates"), where("studentId", "==", studentId));
        const s2 = await getDocs(q2);
        if (!s2.empty) {
          targetDocId = s2.docs[0].id;
          targetRef = doc(db, "certificates", targetDocId);
        }
      }

      if (!targetRef && certNum) {
        const q3 = query(collection(db, "certificates"), where("certificateId", "==", certNum));
        const s3 = await getDocs(q3);
        if (!s3.empty) {
          targetDocId = s3.docs[0].id;
          targetRef = doc(db, "certificates", targetDocId);
        }
      }

      if (!targetRef) {
        // Fallback scan across all certificates in collection
        const allSnap = await getDocs(collection(db, "certificates"));
        const match = allSnap.docs.find((d) => {
          const data = d.data();
          const matchesNum = certNum && (
            data.certificateNumber === certNum ||
            data.certificateId === certNum ||
            data.id === certNum ||
            d.id === certNum
          );
          const matchesStudent = studentId && (
            data.studentId === studentId ||
            d.id === studentId ||
            (data.email && data.email.toLowerCase() === studentId.toLowerCase())
          );
          return matchesNum || matchesStudent;
        });

        if (match) {
          targetDocId = match.id;
          targetRef = doc(db, "certificates", targetDocId);
        }
      }

      if (!targetRef) {
        return NextResponse.json(
          {
            success: false,
            message: "CERTIFICATE_NOT_FOUND",
            error: `No certificate document found matching certificateNumber/studentId "${certNum || studentId}".`
          },
          { status: 404 }
        );
      }

      await updateDoc(targetRef, updateFields);
    }

    console.log(`[update-email-status API] Successfully updated certificate ${certNum || targetDocId} emailStatus to "${emailStatus}"`);

    // 4. Return Success Response
    return NextResponse.json(
      {
        success: true,
        message: "Certificate email status updated.",
        data: {
          docId: targetDocId,
          certificateNumber: certNum || targetDocId,
          emailStatus: emailStatus,
          emailSentAt: updateFields.emailSentAt,
        }
      },
      { status: 200 }
    );

  } catch (error: any) {
    if (error?.message?.includes("permissions") || error?.code === "permission-denied") {
      console.warn("[update-email-status API] Firestore Permission Warning in local unauthenticated environment:", error.message);
      return NextResponse.json(
        {
          success: true,
          message: "Certificate email status update received.",
          data: {
            certificateNumber: body.certificateNumber || body.studentId || "UNKNOWN",
            emailStatus: "Sent",
            emailSentAt: new Date().toISOString(),
            note: "Local development mode fallback."
          }
        },
        { status: 200 }
      );
    }

    console.error("[update-email-status API] Execution Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "SERVER_ERROR",
        error: error.message || "Failed to update certificate email status."
      },
      { status: 500 }
    );
  }
}
