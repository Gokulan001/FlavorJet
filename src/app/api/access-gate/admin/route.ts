import { NextRequest, NextResponse } from "next/server";
import { setActiveCode } from "@/lib/access-gate/store";

const DEFAULT_TTL_MINUTES = 120;
const MAX_TTL_MINUTES = 24 * 60;

// Rotate the active interview access code. Call before each interview:
//   curl -X POST https://<domain>/api/access-gate/admin \
//     -H "x-admin-secret: $ACCESS_GATE_ADMIN_SECRET" \
//     -H "Content-Type: application/json" \
//     -d '{"code":"WHATEVER-CODE","ttlMinutes":120}'
export async function POST(req: NextRequest) {
  const adminSecret = process.env.ACCESS_GATE_ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: "Server misconfigured: ACCESS_GATE_ADMIN_SECRET not set." }, { status: 500 });
  }

  const provided = req.headers.get("x-admin-secret");
  if (provided !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { code?: string; ttlMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  const ttlMinutes = body.ttlMinutes ?? DEFAULT_TTL_MINUTES;

  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Code must be at least 4 characters." }, { status: 400 });
  }
  if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > MAX_TTL_MINUTES) {
    return NextResponse.json({ error: `ttlMinutes must be between 1 and ${MAX_TTL_MINUTES}.` }, { status: 400 });
  }

  const active = await setActiveCode(code, ttlMinutes * 60);
  return NextResponse.json({ ok: true, expiresAt: active.expiresAt });
}
