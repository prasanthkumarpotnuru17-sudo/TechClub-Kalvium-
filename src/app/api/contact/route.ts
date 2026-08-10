import { NextResponse } from "next/server";
import { adminDb, isAdminSdkConfigured } from "@/lib/firebaseAdmin";
import { db as clientDb } from "@/lib/firebase";
import { doc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { safeSetDoc, safeUpdateDoc, removeUndefinedFields } from "@/lib/firestoreUtils";
import { notificationService } from "@/services/notificationService";

// Server-side in-memory cache to ensure zero data loss during dev session
const localContactMessagesMap = new Map<string, any>();

/**
 * Helper to enrich contact messages with registered user details from `users` collection
 */
async function enrichMessagesWithUserDetails(messages: any[]): Promise<any[]> {
  const usersByEmail = new Map<string, any>();
  const usersById = new Map<string, any>();

  try {
    if (isAdminSdkConfigured && adminDb) {
      const usersSnap = await adminDb.collection("users").get();
      usersSnap.forEach((d) => {
        const data = d.data();
        if (data.email) usersByEmail.set(data.email.toLowerCase(), data);
        usersById.set(d.id, data);
      });
    } else {
      const usersSnap = await getDocs(collection(clientDb, "users"));
      usersSnap.forEach((d) => {
        const data = d.data();
        if (data.email) usersByEmail.set(data.email.toLowerCase(), data);
        usersById.set(d.id, data);
      });
    }
  } catch (err) {
    console.warn("[API /api/contact] Warning fetching users for enrichment:", err);
  }

  return messages.map((msg) => {
    const emailKey = (msg.email || "").toLowerCase();
    const userMatch = (msg.userId && usersById.get(msg.userId)) || usersByEmail.get(emailKey);

    if (userMatch) {
      return {
        ...msg,
        isRegisteredUser: true,
        userRole: userMatch.role || "member",
        userDepartment: userMatch.department || userMatch.academicYear || null,
        userAvatar: userMatch.avatar || userMatch.photoURL || null,
      };
    }

    return {
      ...msg,
      isRegisteredUser: false,
      userRole: "Visitor",
      userDepartment: null,
      userAvatar: null,
    };
  });
}

export async function GET() {
  try {
    const itemsMap = new Map<string, any>();

    // 1. Fetch using Admin SDK if available (bypasses security rules)
    if (isAdminSdkConfigured && adminDb) {
      try {
        const snap = await adminDb.collection("contact_messages").orderBy("createdAt", "desc").get();
        snap.forEach((docSnap) => {
          itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (adminErr: any) {
        console.warn("[API /api/contact] Admin SDK fetch notice:", adminErr?.message || adminErr);
      }
    }

    // 2. Fetch using Client SDK as fallback if items map is empty
    if (itemsMap.size === 0) {
      try {
        const snap = await getDocs(collection(clientDb, "contact_messages"));
        snap.forEach((docSnap) => {
          itemsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });
      } catch (clientErr: any) {
        console.warn("[API /api/contact] Client SDK fetch notice:", clientErr?.message || clientErr);
      }
    }

    // 3. Merge local in-memory messages
    localContactMessagesMap.forEach((val, id) => {
      if (!itemsMap.has(id)) {
        itemsMap.set(id, val);
      }
    });

    const rawList = Array.from(itemsMap.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Enrich messages with registered user details
    const enrichedList = await enrichMessagesWithUserDetails(rawList);

    return NextResponse.json({
      success: true,
      data: enrichedList,
    });
  } catch (err: any) {
    console.error("[API /api/contact] GET Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch contact messages", data: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, subject, message, userId } = body;

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { success: false, message: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const formattedSubject = (subject || "").trim() || "General Inquiry";
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const generatedMessageId = `MSG-${new Date().getFullYear()}-${randomSuffix}`;
    const docId = `msg_${Date.now()}_${randomSuffix}`;

    const rawPayload = {
      messageId: generatedMessageId,
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      subject: formattedSubject,
      message: String(message).trim(),
      status: "New",
      priority: "Normal",
      isRead: false,
      replied: false,
      assignedTo: null,
      userId: userId || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cleanPayload = removeUndefinedFields(rawPayload);

    let isSaved = false;

    // Store in local memory cache immediately
    const createdItem = {
      id: docId,
      ...cleanPayload,
    };
    localContactMessagesMap.set(docId, createdItem);

    // Try Firebase Admin SDK write
    if (isAdminSdkConfigured && adminDb) {
      try {
        await adminDb.collection("contact_messages").doc(docId).set(cleanPayload);
        isSaved = true;
      } catch (adminErr: any) {
        console.warn("[API /api/contact] Admin SDK write failed:", adminErr?.message || adminErr);
      }
    }

    // Client SDK fallback
    if (!isSaved) {
      try {
        await safeSetDoc(doc(clientDb, "contact_messages", docId), cleanPayload);
        isSaved = true;
      } catch (clientErr: any) {
        console.warn("[API /api/contact] Client SDK fallback write notice:", clientErr?.message || clientErr);
      }
    }

    // Enrich single created item for response
    const enrichedItems = await enrichMessagesWithUserDetails([createdItem]);
    const finalItem = enrichedItems[0] || createdItem;

    // Trigger notification to Super Admin asynchronously
    notificationService.sendContactMessageNotification(finalItem).catch((err) => {
      console.warn("[API /api/contact] Non-blocking notification error:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Contact message submitted successfully.",
      data: finalItem,
    });
  } catch (err: any) {
    console.error("[API /api/contact] Fatal error handling contact submission:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit contact message.",
        error: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, message: "ID and updates required." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      updatedAt: nowIso,
    });

    if (localContactMessagesMap.has(id)) {
      const existing = localContactMessagesMap.get(id);
      localContactMessagesMap.set(id, { ...existing, ...cleanUpdates });
    }

    if (isAdminSdkConfigured && adminDb) {
      try {
        await adminDb.collection("contact_messages").doc(id).update(cleanUpdates);
      } catch (err: any) {
        console.warn("[API /api/contact] Admin SDK update notice:", err?.message || err);
      }
    }

    try {
      await safeUpdateDoc(doc(clientDb, "contact_messages", id), cleanUpdates);
    } catch (err: any) {
      console.warn("[API /api/contact] Client SDK update notice:", err?.message || err);
    }

    return NextResponse.json({ success: true, message: "Updated successfully" });
  } catch (err: any) {
    console.error("[API /api/contact] PUT Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID parameter required." },
        { status: 400 }
      );
    }

    localContactMessagesMap.delete(id);

    if (isAdminSdkConfigured && adminDb) {
      try {
        await adminDb.collection("contact_messages").doc(id).delete();
      } catch (err: any) {
        console.warn("[API /api/contact] Admin SDK delete notice:", err?.message || err);
      }
    }

    try {
      await deleteDoc(doc(clientDb, "contact_messages", id));
    } catch (err: any) {
      console.warn("[API /api/contact] Client SDK delete notice:", err?.message || err);
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err: any) {
    console.error("[API /api/contact] DELETE Error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Delete failed" },
      { status: 500 }
    );
  }
}
