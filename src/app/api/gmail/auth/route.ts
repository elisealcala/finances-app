import { NextResponse } from "next/server";
import { getAuthUrl } from "@/server/gmail/oauth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Auth failed" },
      { status: 500 },
    );
  }
}
