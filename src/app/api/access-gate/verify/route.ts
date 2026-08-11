import { NextRequest, NextResponse } from "next/server";
import { getActiveCode } from "@/lib/access-gate/store";
import { createSessionToken, GATE_COOKIE_NAME } from "@/lib/access-gate/session";
import { rateLimit } from "@/lib/security/rateLimit";

export async function POST(req: NextRequest) {
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";

  const { allowed } = rateLimit(`access-gate:${clientIp}`, { limit: 10, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a minute." }, { status: 429 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submitted = body.code?.trim().toUpperCase();
  if (!submitted) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  const active = await getActiveCode();
  if (!active || Date.now() > active.expiresAt) {
    return NextResponse.json({ error: "This access code has expired." }, { status: 401 });
  }

  if (submitted !== active.code) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  let token: string;
  try {
    token = createSessionToken(active.expiresAt);
  } catch {
    console.error("[access-gate] ACCESS_GATE_SECRET is not set — cannot issue session.");
    return NextResponse.json({ error: "Server misconfigured. Contact the site owner." }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(active.expiresAt),
  });
  return res;
}
