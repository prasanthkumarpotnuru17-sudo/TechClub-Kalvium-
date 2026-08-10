import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_BUCKET = "certificates";

export async function POST(req: NextRequest) {
  try {
    const { storagePath, expiresIn = 3600 } = await req.json();

    if (!storagePath) {
      return NextResponse.json({ success: false, error: "Missing storagePath" }, { status: 400 });
    }

    let relativePath = storagePath.replace(/^\/+/, "");
    if (relativePath.startsWith("certificates/")) {
      relativePath = relativePath.replace(/^certificates\//, "");
    }

    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(relativePath, expiresIn);

    if (error || !data?.signedUrl) {
      // Fallback: try public URL if signed URL fails
      const { data: publicData } = supabaseAdmin.storage
        .from(SUPABASE_BUCKET)
        .getPublicUrl(relativePath);

      return NextResponse.json({ success: true, signedUrl: publicData?.publicUrl || "" });
    }

    return NextResponse.json({ success: true, signedUrl: data.signedUrl });
  } catch (err: any) {
    console.error("[Server API Route] Certificate signed URL handler error:", err);
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
