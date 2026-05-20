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

// Stub PlaceOrderButton — it's exercised by its own component test
vi.mock("@/components/cart/PlaceOrderButton", () => ({
  default: () => <button data-testid="place-order-stub">Place Order</button>,
}));

const { default: CheckoutPage } = await import("./page");
const { resetTestDb, getTestSqlite, seedHomepageFixtures, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { RedirectError, redirectCalls, clearRedirects } = await import(
  "@/test/mocks/next-navigation"
);
const { addToCart, saveUserAddress } = await import("@/actions/cart-actions");
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
  const elem = await CheckoutPage();
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
  clearRedirects();
});

describe("CheckoutPage", () => {
  it("redirects to /cart when the cart is empty (unauthenticated)", async () => {
    await expect(CheckoutPage()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/cart");
  });

  it("redirects to /cart when authenticated but cart is empty", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await expect(CheckoutPage()).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/cart");
  });

  it("renders the order summary and stubbed PlaceOrderButton when cart has items", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(itemId, 2);

    await renderPage();
    expect(screen.getByRole("heading", { name: "Checkout" })).toBeInTheDocument();
    // The order summary lists the item name
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    // $20.00 appears multiple times: line item total, subtotal, and total
    expect(screen.getAllByText("$20.00").length).toBeGreaterThanOrEqual(2);
    // Stubbed place-order button
    expect(screen.getByTestId("place-order-stub")).toBeInTheDocument();
  });

  it("prefills AddressForm fields when getUserAddress returns saved values", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(itemId, 1);
    await saveUserAddress({
      street: "1 Main St",
      apartment: "Apt 4B",
      city: "Townsville",
      zipCode: "12345",
      phone: "555-1234",
    });

    await renderPage();
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe(
      "1 Main St",
    );
    expect((screen.getByPlaceholderText("New York") as HTMLInputElement).value).toBe(
      "Townsville",
    );
  });

  it("AddressForm inputs are empty when no saved address exists", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(itemId, 1);

    await renderPage();
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe(
      "",
    );
  });

  it("'Your Order (N items)' label matches the cart row count", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const a = seedMenuItemWithModifiers(categoryIds[0], "A");
    const b = seedMenuItemWithModifiers(categoryIds[0], "B");
    const userId = createUser("alice");
    await createAuthSession(userId);
    await addToCart(a.itemId, 1);
    await addToCart(b.itemId, 1);

    await renderPage();
    expect(screen.getByText(/Your Order \(2 items\)/i)).toBeInTheDocument();
  });
});
