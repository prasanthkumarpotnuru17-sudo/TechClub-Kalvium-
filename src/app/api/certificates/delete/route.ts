import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_BUCKET = "certificates";

export async function POST(req: NextRequest) {
  try {
    const { storagePath } = await req.json();

    if (!storagePath) {
      return NextResponse.json({ success: false, error: "Missing storagePath" }, { status: 400 });
    }

    let relativePath = storagePath.replace(/^\/+/, "");
    if (relativePath.startsWith("certificates/")) {
      relativePath = relativePath.replace(/^certificates\//, "");
    }

    console.log(`[Server API Route] Removing object '${relativePath}' from bucket '${SUPABASE_BUCKET}'...`);

    const { error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .remove([relativePath]);

    if (error) {
      console.warn("[Server API Route] Delete warning from Supabase Storage:", error);
    }

    return NextResponse.json({ success: true, storagePath: relativePath });
  } catch (err: any) {
    console.error("[Server API Route] Certificate delete handler error:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
