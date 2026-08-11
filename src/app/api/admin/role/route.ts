import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("[ROLE API TEST] route reached");
    console.log("[ROLE API TEST] body keys:", Object.keys(body));

    return NextResponse.json({
      success: true,
      test: true,
      message: "Role API route is working",
    });
  } catch (error) {
    console.error("[ROLE API TEST] ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Diagnostic route failed",
      },
      { status: 500 }
    );
  }
}




