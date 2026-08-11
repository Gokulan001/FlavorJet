import crypto from "crypto";

export const GATE_COOKIE_NAME = "fj_gate_session";

function getSecret(): string | null {
  return process.env.ACCESS_GATE_SECRET || null;
}

function sign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionToken(expiresAt: number): string {
  const secret = getSecret();
  if (!secret) throw new Error("ACCESS_GATE_SECRET env var is required");

  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  const secret = getSecret();
  if (!secret) {
    console.error("[access-gate] ACCESS_GATE_SECRET is not set — denying all gated routes.");
    return false;
  }
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = sign(payload, secret);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
