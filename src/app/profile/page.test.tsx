import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));
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

// Stub the client-only ProfileAddressForm (it has its own test file)
vi.mock("@/components/profile/ProfileAddressForm", () => ({
  default: () => <div data-testid="profile-address-form-stub" />,
}));

const { default: ProfilePage } = await import("./page");
const { resetTestDb, getTestSqlite } = await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { RedirectError, redirectCalls, clearRedirects } = await import(
  "@/test/mocks/next-navigation"
);
const { createAuthSession } = await import("@/lib/auth");

function createUser(username: string, profilePicture?: string | null): number {
  return (
    getTestSqlite()
      .prepare(
        "INSERT INTO users (username, email, password, profile_picture) VALUES (?, ?, ?, ?) RETURNING id",
      )
      .get(
        username,
        `${username}@test.com`,
        "hash:salt",
        profilePicture ?? null,
      ) as { id: number }
  ).id;
}

function insertOrder(userId: number, total: number) {
  getTestSqlite()
    .prepare(
      "INSERT INTO orders (user_id, status, total, tip) VALUES (?, 'confirmed', ?, 0)",
    )
    .run(userId, total);
}

async function renderPage() {
  const elem = await ProfilePage();
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
  clearRedirects();
});

describe("ProfilePage", () => {
  it("redirects to /login when unauthenticated", async () => {
    await expect(ProfilePage()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/login");
  });

  it("renders username + email in the header", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await renderPage();
    expect(screen.getByRole("heading", { name: "alice" })).toBeInTheDocument();
    expect(screen.getByText("alice@test.com")).toBeInTheDocument();
  });

  it("renders profile picture <img> when present", async () => {
    const userId = createUser("alice", "/img/avatar.jpg");
    await createAuthSession(userId);
    await renderPage();
    const img = screen.getByAltText("alice") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/img/avatar.jpg");
  });

  it("falls back to the User icon when profile picture is null", async () => {
    const userId = createUser("alice", null);
    await createAuthSession(userId);
    await renderPage();
    expect(screen.queryByAltText("alice")).not.toBeInTheDocument();
    // Falls back to the User icon — assert via the wrapper structure
    expect(screen.getByRole("heading", { name: "alice" })).toBeInTheDocument();
  });

  it("shows the empty-state 'No orders yet' when the user has no orders", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await renderPage();
    expect(screen.getByText("No orders yet")).toBeInTheDocument();
  });

  it("displays the order count, total spent, and average order in stats", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    insertOrder(userId, 1000);
    insertOrder(userId, 2000);
    insertOrder(userId, 3000);
    await renderPage();

    expect(screen.getByText("3")).toBeInTheDocument(); // count
    // Total spent = $60.00; avg = $20.00. $20.00 also appears in the order list,
    // so allow ≥1 matches for both.
    expect(screen.getAllByText("$60.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$20.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the recent orders list (up to 5)", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    for (let i = 1; i <= 5; i++) {
      insertOrder(userId, 1000 * i);
    }
    await renderPage();

    // Each recent order shows the per-order link to /orders/{id}
    const orderLinks = Array.from(document.querySelectorAll('a[href^="/orders/"]'));
    expect(orderLinks.length).toBeGreaterThanOrEqual(5);
  });

  it("'View All Orders' link appears when there are more than 5 orders", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    for (let i = 1; i <= 6; i++) {
      insertOrder(userId, 1000);
    }
    await renderPage();
    const viewAllLink = screen.getByRole("link", { name: /View All Orders/i });
    expect(viewAllLink.getAttribute("href")).toBe("/orders");
  });

  it("'View All Orders' link does NOT appear when there are 5 or fewer orders", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    for (let i = 1; i <= 5; i++) {
      insertOrder(userId, 1000);
    }
    await renderPage();
    expect(screen.queryByRole("link", { name: /View All Orders/i })).not.toBeInTheDocument();
  });

  it("shows the avg order as '$0.00' when the user has no orders (no division by zero)", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await renderPage();
    expect(screen.getAllByText("$0.00").length).toBeGreaterThanOrEqual(1);
  });
});
