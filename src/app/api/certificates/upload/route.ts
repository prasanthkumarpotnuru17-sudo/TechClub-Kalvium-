import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPABASE_BUCKET = "certificates";

export async function POST(req: NextRequest) {
  try {
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const keyPrefix = serviceKey ? serviceKey.slice(0, 10) : "UNDEFINED";
    console.log(`[Server API Route] SUPABASE_SERVICE_ROLE_KEY loaded (Prefix: '${keyPrefix}...')`);

    if (!serviceKey || serviceKey.startsWith("sb_publishable_")) {
      const errDetail = !serviceKey
        ? "SUPABASE_SERVICE_ROLE_KEY is undefined in .env.local."
        : `SUPABASE_SERVICE_ROLE_KEY is set to a publishable key ('${keyPrefix}...') instead of a secret service_role key.`;
      
      console.error(`[Server API Route Error] ${errDetail}`);
      return NextResponse.json(
        {
          success: false,
          error: `RLS policy violation prevention error: ${errDetail} Obtain your secret service_role key from Supabase Dashboard -> Project Settings -> API -> service_role secret key and set SUPABASE_SERVICE_ROLE_KEY in .env.local.`,
        },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const eventId = (formData.get("eventId") as string || "general_event").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
    const userId = (formData.get("userId") as string || "anonymous_user").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_.-]/g, "");
    const certificateId = (formData.get("certificateId") as string || `cert_${Date.now()}`).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file blob provided in request." }, { status: 400 });
    }

    // Convert file Blob to Buffer for server-side Supabase Storage upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Object path inside bucket 'certificates': {eventId}/{userId}/{certificateId}.pdf
    const objectPath = `${eventId}/${userId}/${certificateId}.pdf`;

    console.log(`[Server API Route] Uploading certificate PDF to Supabase Storage bucket '${SUPABASE_BUCKET}', object path: '${objectPath}' (${buffer.length} bytes)...`);

    // Upload to Supabase Storage using server-side Supabase Admin client (bypasses RLS using service_role key)
    const { data, error } = await supabaseAdmin.storage
      .from(SUPABASE_BUCKET)
      .upload(objectPath, buffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      console.error("[Server API Route] Supabase Storage upload error:", error);
      return NextResponse.json(
        { success: false, error: `Supabase Storage upload failed: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[Server API Route] Upload successful! Storage path: '${objectPath}'`);

    return NextResponse.json({
      success: true,
      storagePath: objectPath,
    });
  } catch (err: any) {
    console.error("[Server API Route] Certificate upload handler error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
