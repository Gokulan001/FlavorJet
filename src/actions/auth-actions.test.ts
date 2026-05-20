import { describe, it, expect, beforeEach, vi } from "vitest";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

vi.mock("next/headers", () => import("@/test/mocks/next-headers"));
vi.mock("next/navigation", () => import("@/test/mocks/next-navigation"));
vi.mock("@/lib/cloudinary", () => import("@/test/mocks/cloudinary"));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return {
    sqlite: m.getTestSqlite(),
    db: m.getTestDb(),
  };
});

const { signup, login, logout, getUserProfile } = await import("./auth-actions");
const {
  clearMockHeadersAndCookies,
  setMockHeader,
  getMockCookie,
} = await import("@/test/mocks/next-headers");
const { redirectCalls, clearRedirects, RedirectError } = await import(
  "@/test/mocks/next-navigation"
);
const { uploadImage: mockUpload, resetCloudinaryMock } = await import(
  "@/test/mocks/cloudinary"
);
const { resetTestDb, getTestDb, getTestSqlite } = await import("@/test/db");
const { lucia } = await import("@/lib/auth");

const FAKE_INITIAL = {};
const makeFile = (size = 5) =>
  new File([new Uint8Array(size)], "avatar.png", { type: "image/png" });

let ipCounter = 0;
const uniqueIp = () => `10.0.${Math.floor(ipCounter / 256)}.${ipCounter++ % 256}`;

function buildSignupFormData(overrides: Partial<{
  username: string;
  email: string;
  password: string;
  profilePicture: File | null;
  redirectTo: string;
}> = {}) {
  const fd = new FormData();
  fd.set("username", overrides.username ?? "logan");
  fd.set("email", overrides.email ?? "logan@test.com");
  fd.set("password", overrides.password ?? "secret123");
  const file = overrides.profilePicture === undefined ? makeFile() : overrides.profilePicture;
  if (file) fd.set("profilePicture", file);
  else fd.set("profilePicture", new File([], "empty.png", { type: "image/png" }));
  if (overrides.redirectTo) fd.set("redirectTo", overrides.redirectTo);
  return fd;
}

function buildLoginFormData(overrides: Partial<{
  username: string;
  password: string;
  redirectTo: string;
}> = {}) {
  const fd = new FormData();
  fd.set("username", overrides.username ?? "logan");
  fd.set("password", overrides.password ?? "secret123");
  if (overrides.redirectTo) fd.set("redirectTo", overrides.redirectTo);
  return fd;
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
  clearRedirects();
  resetCloudinaryMock();
  setMockHeader("x-forwarded-for", uniqueIp());
});

describe("signup — validation", () => {
  it("returns errors.username when username is empty", async () => {
    const fd = buildSignupFormData({ username: "" });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.username).toBe("Username is required");
  });

  it("returns errors.username when username is whitespace", async () => {
    const fd = buildSignupFormData({ username: "   " });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.username).toBe("Username is required");
  });

  it("returns errors.email when email lacks '@'", async () => {
    const fd = buildSignupFormData({ email: "not-an-email" });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.email).toBe("Invalid email address");
  });

  it("returns errors.password when password is < 8 chars", async () => {
    const fd = buildSignupFormData({ password: "short" });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.password).toBe("Password must be at least 8 characters");
  });

  it("returns errors.profilePicture when file is empty", async () => {
    const fd = buildSignupFormData({ profilePicture: null });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.profilePicture).toBe("Profile picture is required");
  });

  it("returns multiple errors at once", async () => {
    const fd = buildSignupFormData({
      username: "",
      email: "bad",
      password: "x",
      profilePicture: null,
    });
    const result = await signup(FAKE_INITIAL, fd);
    expect(Object.keys(result.errors ?? {}).sort()).toEqual([
      "email",
      "password",
      "profilePicture",
      "username",
    ]);
  });

  it("does not call cloudinary when validation fails", async () => {
    const fd = buildSignupFormData({ username: "" });
    await signup(FAKE_INITIAL, fd);
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe("signup — rate limit", () => {
  it("blocks the 4th call within the 60s window from the same IP", async () => {
    const ip = uniqueIp();
    setMockHeader("x-forwarded-for", ip);

    // Trigger 3 validation failures (rate-limit increments before validation)
    for (let i = 0; i < 3; i++) {
      const fd = buildSignupFormData({ username: "" });
      await signup(FAKE_INITIAL, fd);
    }

    const fd = buildSignupFormData({ username: "" });
    const result = await signup(FAKE_INITIAL, fd);
    expect(result.errors?.email).toBe("Too many signup attempts. Please wait a minute.");
  });

  it("uses the first IP from a comma-separated x-forwarded-for", async () => {
    const ip = uniqueIp();
    setMockHeader("x-forwarded-for", `${ip}, 192.168.1.1, 10.0.0.1`);

    for (let i = 0; i < 3; i++) {
      await signup(FAKE_INITIAL, buildSignupFormData({ username: "" }));
    }
    const result = await signup(FAKE_INITIAL, buildSignupFormData({ username: "" }));
    expect(result.errors?.email).toBe("Too many signup attempts. Please wait a minute.");
  });
});

describe("signup — cloudinary failure", () => {
  it("returns errors.profilePicture when upload throws", async () => {
    mockUpload.mockRejectedValueOnce(new Error("cloudinary down"));
    const result = await signup(FAKE_INITIAL, buildSignupFormData());
    expect(result.errors?.profilePicture).toBe("Failed to upload profile picture");
  });

  it("does not insert a user when upload fails", async () => {
    mockUpload.mockRejectedValueOnce(new Error("nope"));
    await signup(FAKE_INITIAL, buildSignupFormData());
    const rows = getTestDb().select().from(users).all();
    expect(rows).toHaveLength(0);
  });
});

describe("signup — success path", () => {
  it("inserts a user, creates a session, redirects to '/'", async () => {
    const promise = signup(FAKE_INITIAL, buildSignupFormData());
    await expect(promise).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/");

    const rows = getTestDb().select().from(users).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      username: "logan",
      email: "logan@test.com",
      profilePicture: "https://cdn.test/profile.jpg",
    });

    const sessions = getTestSqlite().prepare("SELECT * FROM sessions").all();
    expect(sessions).toHaveLength(1);

    const cookie = getMockCookie(lucia.sessionCookieName);
    expect(cookie?.value).toBeTruthy();
  });

  it("stores the password hashed, never as plaintext", async () => {
    await signup(FAKE_INITIAL, buildSignupFormData({ password: "supersecret" })).catch(
      () => {},
    );
    const row = getTestDb().select().from(users).where(eq(users.username, "logan")).get();
    expect(row?.password).toBeTruthy();
    expect(row?.password).not.toBe("supersecret");
    expect(row?.password).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
  });

  it("redirects to redirectTo when supplied", async () => {
    const promise = signup(
      FAKE_INITIAL,
      buildSignupFormData({ redirectTo: "/menu" }),
    );
    await expect(promise).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/menu");
  });
});

describe("signup — duplicate username/email", () => {
  it("returns errors.email when username or email already exists", async () => {
    // First signup succeeds (and redirects)
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});

    setMockHeader("x-forwarded-for", uniqueIp());

    // Second with same username/email triggers SQLITE_CONSTRAINT_UNIQUE
    const result = await signup(FAKE_INITIAL, buildSignupFormData());
    expect(result.errors?.email).toBe("Email or username already in use");
  });
});

describe("login — rate limit", () => {
  it("blocks the 6th call within the 60s window", async () => {
    const ip = uniqueIp();
    setMockHeader("x-forwarded-for", ip);

    for (let i = 0; i < 5; i++) {
      await login(FAKE_INITIAL, buildLoginFormData({ username: "nobody" }));
    }
    const result = await login(FAKE_INITIAL, buildLoginFormData({ username: "nobody" }));
    expect(result.errors?.credentials).toBe("Too many login attempts. Please wait a minute.");
  });
});

describe("login — credentials", () => {
  it("returns generic error for unknown username", async () => {
    const result = await login(FAKE_INITIAL, buildLoginFormData({ username: "ghost" }));
    expect(result.errors?.credentials).toBe("Invalid username or password");
  });

  it("returns the same generic error for wrong password (no user enumeration)", async () => {
    // Seed a user via signup
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});

    setMockHeader("x-forwarded-for", uniqueIp());

    const result = await login(
      FAKE_INITIAL,
      buildLoginFormData({ username: "logan", password: "wrong-password-12345" }),
    );
    expect(result.errors?.credentials).toBe("Invalid username or password");
  });
});

describe("login — success", () => {
  it("creates a session and redirects to '/'", async () => {
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});
    clearRedirects();
    clearMockHeadersAndCookies();
    setMockHeader("x-forwarded-for", uniqueIp());

    // Remove all sessions to ensure login creates a fresh one
    getTestSqlite().exec("DELETE FROM sessions");

    const promise = login(
      FAKE_INITIAL,
      buildLoginFormData({ username: "logan", password: "secret123" }),
    );
    await expect(promise).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/");

    const sessions = getTestSqlite().prepare("SELECT * FROM sessions").all();
    expect(sessions).toHaveLength(1);
  });

  it("honors redirectTo on success", async () => {
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});
    clearRedirects();
    clearMockHeadersAndCookies();
    setMockHeader("x-forwarded-for", uniqueIp());

    const promise = login(
      FAKE_INITIAL,
      buildLoginFormData({
        username: "logan",
        password: "secret123",
        redirectTo: "/orders",
      }),
    );
    await expect(promise).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/orders");
  });
});

describe("logout", () => {
  it("destroys the session and redirects to /login", async () => {
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});

    await expect(logout()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/login");

    const sessions = getTestSqlite().prepare("SELECT * FROM sessions").all();
    expect(sessions).toHaveLength(0);
  });
});

describe("getUserProfile", () => {
  it("returns null when no session", async () => {
    expect(await getUserProfile()).toBeNull();
  });

  it("returns the user's profile when authenticated", async () => {
    await signup(FAKE_INITIAL, buildSignupFormData()).catch(() => {});

    const profile = await getUserProfile();
    expect(profile).toMatchObject({
      username: "logan",
      email: "logan@test.com",
      profilePicture: "https://cdn.test/profile.jpg",
      phone: null,
      street: null,
      apartment: null,
      city: null,
      zipCode: null,
    });
    expect(profile?.createdAt).toBeTruthy();
  });
});
