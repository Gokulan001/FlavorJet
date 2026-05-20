import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("next/link", () => import("@/test/mocks/next-link"));
vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/headers", () => import("@/test/mocks/next-headers"));
vi.mock("next/navigation", () => import("@/test/mocks/next-navigation"));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

// Stub the very large client AIAssistantPage — its own behavior is out of scope here.
vi.mock("@/components/chat/AIAssistantPage", () => ({
  default: ({ user }: { user: { username: string; hasAddress: boolean } }) => (
    <div data-testid="ai-assistant-page-stub">
      <span data-testid="username">{user.username}</span>
      <span data-testid="has-address">{String(user.hasAddress)}</span>
    </div>
  ),
}));

// Stub ErrorBoundary so it doesn't interfere with rendering
vi.mock("@/components/error/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: OrderAIPage } = await import("./page");
const { resetTestDb, getTestSqlite } = await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { RedirectError, redirectCalls, clearRedirects } = await import(
  "@/test/mocks/next-navigation"
);
const { createAuthSession } = await import("@/lib/auth");

function createUser(username: string) {
  return (
    getTestSqlite()
      .prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
      )
      .get(username, `${username}@test.com`, "hash:salt") as { id: number }
  ).id;
}

function setUserAddress(userId: number) {
  getTestSqlite()
    .prepare(
      "UPDATE users SET street = ?, apartment = ?, city = ?, zip_code = ?, phone = ? WHERE id = ?",
    )
    .run("1 Main St", "", "Springfield", "12345", "555-0100", userId);
}

async function renderPage() {
  const elem = await OrderAIPage();
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
  clearRedirects();
});

describe("OrderAIPage (server)", () => {
  it("redirects to /login when unauthenticated", async () => {
    await expect(OrderAIPage()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/login");
  });

  it("renders AIAssistantPage with hasAddress=false when the user has no saved address", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    const { getByTestId } = await renderPage();
    expect(getByTestId("ai-assistant-page-stub")).toBeInTheDocument();
    expect(getByTestId("username").textContent).toBe("alice");
    expect(getByTestId("has-address").textContent).toBe("false");
  });

  it("renders AIAssistantPage with hasAddress=true when the user has an address", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    setUserAddress(userId);
    const { getByTestId } = await renderPage();
    expect(getByTestId("has-address").textContent).toBe("true");
  });
});
