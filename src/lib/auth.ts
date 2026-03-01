import { Lucia } from "lucia";
import { BetterSqlite3Adapter } from "@lucia-auth/adapter-sqlite";
import { cookies } from "next/headers";
import { sqlite } from "@/db";

const adapter = new BetterSqlite3Adapter(sqlite, {
  user: "users",
  session: "sessions",
});

interface DatabaseUserAttributes {
  username: string;
  profile_picture: string | null;
}

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    expires: false,
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes: DatabaseUserAttributes) => {
    return {
      username: attributes.username,
      profilePicture: attributes.profile_picture,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

// ── Session creation (uses Lucia — only called from Server Actions) ──────────
export async function createAuthSession(userId: number) {
  const session = await lucia.createSession(String(userId), {});
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookieStore = await cookies();
  cookieStore.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
}

// ── Direct DB session read — NEVER hangs, no Lucia overhead ──────────────────
// This is the key fix: instead of going through Lucia's validateSession()
// (which can interact badly with Next.js RSC streaming / Turbopack HMR),
// we read the session + user directly with a single synchronous SQLite query.

interface SessionUser {
  id: string;
  username: string;
  profilePicture: string | null;
}

const getSessionStmt = sqlite.prepare(`
  SELECT s.id as session_id, s.user_id, s.expires_at,
         u.username, u.profile_picture
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.id = ?
`);

export async function verifyAuth(): Promise<{ user: SessionUser | null; session: { id: string } | null }> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(lucia.sessionCookieName);

    if (!sessionCookie?.value) {
      return { user: null, session: null };
    }

    const row = getSessionStmt.get(sessionCookie.value) as {
      session_id: string;
      user_id: number;
      expires_at: number;
      username: string;
      profile_picture: string | null;
    } | undefined;

    if (!row) {
      return { user: null, session: null };
    }

    // Check expiry (expires_at is Unix seconds)
    const now = Math.floor(Date.now() / 1000);
    if (row.expires_at < now) {
      return { user: null, session: null };
    }

    return {
      user: {
        id: String(row.user_id),
        username: row.username,
        profilePicture: row.profile_picture,
      },
      session: { id: row.session_id },
    };
  } catch {
    return { user: null, session: null };
  }
}

// Alias — Server Actions can use the same function now since we don't set cookies during reads
export const verifyAuthAndRefresh = verifyAuth;

// ── Session destruction ──────────────────────────────────────────────────────
export async function destroySession() {
  const { session } = await verifyAuth();
  if (!session) return { error: "Unauthorized" };

  await lucia.invalidateSession(session.id);
  const blankCookie = lucia.createBlankSessionCookie();
  const cookieStore = await cookies();
  cookieStore.set(blankCookie.name, blankCookie.value, blankCookie.attributes);
}
