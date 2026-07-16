import { NextResponse } from "next/server";
import { exchangeCodeAndStore } from "@/server/gmail/oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const settingsUrl = new URL("/finances/imports/settings", url.origin);

  if (error) {
    settingsUrl.searchParams.set("error", error);
    return NextResponse.redirect(settingsUrl);
  }
  if (!code) {
    settingsUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const email = await exchangeCodeAndStore(code);
    settingsUrl.searchParams.set("connected", email);
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    settingsUrl.searchParams.set(
      "error",
      err instanceof Error ? err.message : "callback_failed",
    );
    return NextResponse.redirect(settingsUrl);
  }
}
