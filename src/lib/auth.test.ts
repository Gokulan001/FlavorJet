import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/headers", () => import("@/test/mocks/next-headers"));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return {
    sqlite: m.getTestSqlite(),
    db: m.getTestDb(),
  };
});

const { createAuthSession, verifyAuth, destroySession, lucia } = await import("./auth");
const { clearMockHeadersAndCookies, getMockCookie, setMockCookie } = await import(
  "@/test/mocks/next-headers"
);
const { resetTestDb, getTestSqlite } = await import("@/test/db");

describe("auth.ts — session lifecycle", () => {
  let userId: number;

  beforeEach(() => {
    resetTestDb();
    clearMockHeadersAndCookies();
    const row = getTestSqlite()
      .prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
      )
      .get("tester", "tester@test.com", "abcd:efgh") as { id: number };
    userId = row.id;
  });

  it("createAuthSession inserts a session row and sets a cookie", async () => {
    await createAuthSession(userId);

    const rows = getTestSqlite()
      .prepare("SELECT id, user_id, expires_at FROM sessions")
      .all();
    expect(rows).toHaveLength(1);

    const cookie = getMockCookie(lucia.sessionCookieName);
    expect(cookie).toBeDefined();
    expect(cookie!.value).toBeTruthy();
  });

  it("verifyAuth returns the user when cookie + session are valid", async () => {
    await createAuthSession(userId);
    const { user, session } = await verifyAuth();
    expect(user).not.toBeNull();
    expect(user!.username).toBe("tester");
    expect(user!.id).toBe(String(userId));
    expect(session).not.toBeNull();
    expect(session!.id).toBeTruthy();
  });

  it("verifyAuth returns null when no cookie is present", async () => {
    const { user, session } = await verifyAuth();
    expect(user).toBeNull();
    expect(session).toBeNull();
  });

  it("verifyAuth returns null when the session row is missing", async () => {
    setMockCookie(lucia.sessionCookieName, "does-not-exist");
    const { user, session } = await verifyAuth();
    expect(user).toBeNull();
    expect(session).toBeNull();
  });

  it("verifyAuth returns null when the session has expired", async () => {
    await createAuthSession(userId);
    const pastUnixSeconds = Math.floor(Date.now() / 1000) - 3600;
    getTestSqlite()
      .prepare("UPDATE sessions SET expires_at = ?")
      .run(pastUnixSeconds);

    const { user, session } = await verifyAuth();
    expect(user).toBeNull();
    expect(session).toBeNull();
  });

  it("destroySession invalidates the session and clears the cookie", async () => {
    await createAuthSession(userId);
    await destroySession();

    const rows = getTestSqlite().prepare("SELECT id FROM sessions").all();
    expect(rows).toHaveLength(0);

    const cookie = getMockCookie(lucia.sessionCookieName);
    expect(cookie?.value ?? "").toBe("");
  });

  it("destroySession returns { error: 'Unauthorized' } when no session present", async () => {
    const result = await destroySession();
    expect(result).toEqual({ error: "Unauthorized" });
  });

  it("session cookie is not secure in development (NODE_ENV !== 'production')", () => {
    expect(process.env.NODE_ENV).not.toBe("production");
    const blank = lucia.createBlankSessionCookie();
    expect(blank.attributes.secure).toBeFalsy();
  });
});
