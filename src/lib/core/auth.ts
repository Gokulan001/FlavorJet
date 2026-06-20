// ── Auth domain core ─────────────────────────────────────────────────────────
// Framework-agnostic auth: no next/headers, no cookies, no Lucia cookie helpers.
// Sessions are written to the SAME `sessions` table the web app reads via
// src/lib/auth.ts (id = random token, expires_at = unix SECONDS) — so a session
// created here is valid for the web app and vice versa.
//
// The MCP server uses this to log in (username + password) and to resolve a
// session id back to a userId on every authenticated tool call.

import crypto from "node:crypto";
import { db, sqlite } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/hash";

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days (matches Lucia default)

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

export type LoginResult =
  | { userId: number; sessionId: string; username: string }
  | { error: "invalid_credentials" };

/** Verify username + password and create a session row. */
export function loginWithPassword(username: string, password: string): LoginResult {
  const user = db.select().from(users).where(eq(users.username, username)).get();
  if (!user) return { error: "invalid_credentials" };

  if (!verifyPassword(user.password, password)) return { error: "invalid_credentials" };

  const sessionId = crypto.randomBytes(20).toString("hex"); // 40-char token
  const expiresAt = nowSeconds() + SESSION_TTL_SECONDS;
  sqlite
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .run(sessionId, user.id, expiresAt);

  return { userId: user.id, sessionId, username: user.username };
}

/** Resolve a session id to a userId, honouring expiry. Returns null if invalid. */
export function validateSessionId(sessionId: string): { userId: number; username: string } | null {
  const row = sqlite
    .prepare(
      `SELECT s.user_id as userId, s.expires_at as expiresAt, u.username as username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(sessionId) as { userId: number; expiresAt: number; username: string } | undefined;

  if (!row) return null;
  if (row.expiresAt < nowSeconds()) return null;
  return { userId: row.userId, username: row.username };
}

/** Invalidate a session (logout). */
export function logoutSession(sessionId: string): void {
  sqlite.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
}
