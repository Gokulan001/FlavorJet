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

// Stub the two interactive children that have their own tests
vi.mock("@/components/orders/OrderTimeline", () => ({
  default: () => <div data-testid="order-timeline-stub" />,
}));
vi.mock("@/components/orders/ReorderButton", () => ({
  default: () => <button data-testid="reorder-stub">Reorder</button>,
}));

const { default: OrderDetailPage } = await import("./page");
const { resetTestDb, getTestSqlite, seedHomepageFixtures, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { NotFoundError } = await import("@/test/mocks/next-navigation");
const { createAuthSession } = await import("@/lib/auth");
const { addToCart, placeOrder } = await import("@/actions/cart-actions");

function createUser(username: string): number {
  return (
    getTestSqlite()
      .prepare(
        "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
      )
      .get(username, `${username}@test.com`, "hash:salt") as { id: number }
  ).id;
}

async function renderPage(orderId: string) {
  const elem = await OrderDetailPage({ params: Promise.resolve({ orderId }) });
  return render(elem as React.ReactElement);
}

async function seedAndPlaceOrder(opts: {
  username: string;
  withModifiers?: boolean;
  withInstructions?: boolean;
  address?: string;
  phone?: string;
  tip?: number;
}): Promise<{ orderId: number }> {
  const { categoryIds } = seedHomepageFixtures();
  const seedResult = opts.withModifiers
    ? seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
        {
          name: "Toppings",
          maxSelect: 3,
          modifiers: [{ name: "Cheese", priceAdjustment: 200 }],
        },
      ])
    : seedMenuItemWithModifiers(categoryIds[0], "Pizza");

  const userId = createUser(opts.username);
  await createAuthSession(userId);
  await addToCart(seedResult.itemId, 2, opts.withModifiers ? [seedResult.modifierIds[0]] : []);

  if (opts.withInstructions) {
    getTestSqlite()
      .prepare(
        "UPDATE cart_items SET special_instructions = 'no salt' WHERE user_id = ?",
      )
      .run(userId);
  }

  try {
    await placeOrder(opts.address, opts.phone, opts.tip);
  } catch {
    // expected NEXT_REDIRECT
  }
  const orderId = (
    getTestSqlite()
      .prepare("SELECT id FROM orders WHERE user_id = ?")
      .get(userId) as { id: number }
  ).id;
  return { orderId };
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
});

describe("OrderDetailPage", () => {
  it("throws NotFoundError for a non-existent orderId", async () => {
    const userId = createUser("alice");
    await createAuthSession(userId);
    await expect(
      OrderDetailPage({ params: Promise.resolve({ orderId: "99999" }) }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the order belongs to a different user", async () => {
    const { orderId } = await seedAndPlaceOrder({ username: "alice" });
    clearMockHeadersAndCookies();
    const bobId = createUser("bob");
    await createAuthSession(bobId);

    await expect(
      OrderDetailPage({ params: Promise.resolve({ orderId: String(orderId) }) }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("renders the confirmation banner when status='confirmed'", async () => {
    const { orderId } = await seedAndPlaceOrder({ username: "alice" });
    await renderPage(String(orderId));
    expect(screen.getByRole("heading", { name: "Order Confirmed!" })).toBeInTheDocument();
  });

  it("renders item name, modifiers, and special instructions", async () => {
    const { orderId } = await seedAndPlaceOrder({
      username: "alice",
      withModifiers: true,
      withInstructions: true,
    });
    await renderPage(String(orderId));

    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText(/Cheese/)).toBeInTheDocument();
    expect(screen.getByText(/no salt/)).toBeInTheDocument();
  });

  it("renders quantity × unit price ('$X.XX x N') for each item", async () => {
    const { orderId } = await seedAndPlaceOrder({ username: "alice" });
    await renderPage(String(orderId));
    expect(screen.getByText(/\$10\.00 x 2/)).toBeInTheDocument();
  });

  it("shows the Tip section only when order.tip > 0", async () => {
    // Order with tip
    const { orderId: withTipId } = await seedAndPlaceOrder({
      username: "tipper",
      tip: 300,
    });
    const { unmount } = await renderPage(String(withTipId));
    expect(screen.getByText("Tip")).toBeInTheDocument();
    unmount();
    resetTestDb();
    clearMockHeadersAndCookies();

    // Order without tip
    const { orderId: noTipId } = await seedAndPlaceOrder({ username: "stingy", tip: 0 });
    await renderPage(String(noTipId));
    expect(screen.queryByText("Tip")).not.toBeInTheDocument();
  });

  it("shows Delivery Details only when deliveryAddress is non-empty", async () => {
    // With address
    const { orderId: withAddrId } = await seedAndPlaceOrder({
      username: "alice",
      address: "1 Main St",
      phone: "555-1234",
    });
    const { unmount } = await renderPage(String(withAddrId));
    expect(screen.getByText("Delivery Details")).toBeInTheDocument();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    expect(screen.getByText("555-1234")).toBeInTheDocument();
    unmount();
    resetTestDb();
    clearMockHeadersAndCookies();

    // Without address
    const { orderId: noAddrId } = await seedAndPlaceOrder({ username: "bob" });
    await renderPage(String(noAddrId));
    expect(screen.queryByText("Delivery Details")).not.toBeInTheDocument();
  });

  it("renders the stubbed ReorderButton and OrderTimeline", async () => {
    const { orderId } = await seedAndPlaceOrder({ username: "alice" });
    await renderPage(String(orderId));
    expect(screen.getByTestId("reorder-stub")).toBeInTheDocument();
    expect(screen.getByTestId("order-timeline-stub")).toBeInTheDocument();
  });
});
