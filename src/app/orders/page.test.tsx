import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

const { default: OrdersPage } = await import("./page");
const { resetTestDb, getTestSqlite } = await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { createAuthSession } = await import("@/lib/auth");

function createUser(username: string): number {
  return (
    getTestSqlite()
      .prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
      )
      .get(username, `${username}@test.com`, "hash:salt") as { id: number }
  ).id;
}

function insertOrder(
  userId: number,
  total: number,
  status: string = "confirmed",
) {
  return Number(
    getTestSqlite()
      .prepare(
        "INSERT INTO orders (user_id, status, total, tip) VALUES (?, ?, ?, 0)",
      )
      .run(userId, status, total).lastInsertRowid,
  );
}

async function renderPage() {
  const elem = await OrdersPage();
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
});

describe("OrdersPage", () => {
  it("renders the empty-state view when unauthenticated", async () => {
    await renderPage();
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
    const browseLink = screen.getByRole("link", { name: /Browse Menu/i });
    expect(browseLink.getAttribute("href")).toBe("/menu");
  });

  it("renders the empty-state view when authenticated but no orders exist", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await renderPage();
    expect(screen.getByText(/No orders yet/i)).toBeInTheDocument();
  });

  it("renders one order card per row, each linking to /orders/{id}", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    const oneId = insertOrder(userId, 1000);
    const twoId = insertOrder(userId, 2500);
    await renderPage();

    const oneLink = document.querySelector(`a[href="/orders/${oneId}"]`);
    const twoLink = document.querySelector(`a[href="/orders/${twoId}"]`);
    expect(oneLink).not.toBeNull();
    expect(twoLink).not.toBeNull();
    expect(screen.getByText(`Order #${oneId}`)).toBeInTheDocument();
    expect(screen.getByText(`Order #${twoId}`)).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("applies distinct status badge classes per status", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    insertOrder(userId, 1000, "confirmed");
    insertOrder(userId, 2000, "cancelled");
    await renderPage();

    const confirmedBadge = screen.getByText("confirmed");
    const cancelledBadge = screen.getByText("cancelled");
    expect(confirmedBadge.className).toMatch(/green/);
    expect(cancelledBadge.className).toMatch(/red/);
  });

  it("shows the total order count in the header (singular vs plural)", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    insertOrder(userId, 1000);
    await renderPage();
    expect(screen.getByText("1 order")).toBeInTheDocument();
  });
});
