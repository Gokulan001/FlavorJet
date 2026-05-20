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

const { default: CartPage } = await import("./page");
const { resetTestDb, getTestSqlite, seedHomepageFixtures, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { addToCart } = await import("@/actions/cart-actions");
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

async function renderPage() {
  const elem = await CartPage();
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
});

describe("CartPage", () => {
  it("renders the empty cart view + 'Browse Menu' link when unauthenticated", async () => {
    await renderPage();
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    const browseLink = screen.getByRole("link", { name: /Browse Menu/i });
    expect(browseLink.getAttribute("href")).toBe("/menu");
  });

  it("renders an empty cart view when authenticated but no cart rows exist", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await renderPage();
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
  });

  it("renders one CartItemCard per cart row when populated", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const a = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const b = seedMenuItemWithModifiers(categoryIds[0], "Burger");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(a.itemId, 2);
    await addToCart(b.itemId, 1);

    await renderPage();
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("Burger")).toBeInTheDocument();
  });

  it("computes a subtotal equal to the sum of line totals", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const a = seedMenuItemWithModifiers(categoryIds[0], "Pizza"); // base 1000
    const b = seedMenuItemWithModifiers(categoryIds[0], "Burger"); // base 1000
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(a.itemId, 2);
    await addToCart(b.itemId, 3);

    await renderPage();
    // Subtotal = 2000 + 3000 = $50.00 (formatted)
    // Both the desktop summary and mobile sticky footer render the subtotal
    const subtotals = screen.getAllByText("$50.00");
    expect(subtotals.length).toBeGreaterThanOrEqual(1);
  });

  it("renders an item count label matching the total quantity", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const a = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(a.itemId, 4);

    await renderPage();
    expect(screen.getByText(/4 items in your cart/i)).toBeInTheDocument();
  });
});
