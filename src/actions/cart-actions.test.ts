import { describe, it, expect, beforeEach, vi } from "vitest";

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

const {
  addToCart,
  quickAddToCart,
  getCart,
  getCartCount,
  updateCartQuantity,
  updateSpecialInstructions,
  removeFromCart,
  addToCartBySlug,
  removeFromCartBySlug,
  saveUserAddress,
  getUserAddress,
  placeOrder,
  placeOrderFromAI,
  getOrders,
  getOrderById,
  reorderFromOrder,
} = await import("./cart-actions");
const { RedirectError, redirectCalls, clearRedirects } = await import(
  "@/test/mocks/next-navigation"
);
const { resetTestDb, getTestSqlite, seedHomepageFixtures, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { clearMockHeadersAndCookies } = await import("@/test/mocks/next-headers");
const { createAuthSession } = await import("@/lib/auth");

function createUser(username: string): number {
  const row = getTestSqlite()
    .prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
    )
    .get(username, `${username}@test.com`, "hash:salt") as { id: number };
  return row.id;
}

async function signIn(userId: number) {
  await createAuthSession(userId);
}

beforeEach(() => {
  resetTestDb();
  clearMockHeadersAndCookies();
  clearRedirects();
});

describe("addToCart — auth", () => {
  it("returns { error: 'not_authenticated' } when no session", async () => {
    seedHomepageFixtures();
    const result = await addToCart(1, 1);
    expect(result).toEqual({ error: "not_authenticated" });
  });
});

describe("addToCart — happy paths", () => {
  it("inserts a new cart row when none matches user/item/modifiers", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);

    const result = await addToCart(itemId, 2);
    expect(result).toEqual({ success: true });

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId) as { id: number; quantity: number; menu_item_id: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);
    expect(rows[0].menu_item_id).toBe(itemId);
  });

  it("increments quantity when the same item + same sorted modifiers are added", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [
          { name: "Cheese", priceAdjustment: 100 },
          { name: "Pepperoni", priceAdjustment: 150 },
        ],
      },
    ]);
    const userId = createUser("bob");
    await signIn(userId);

    await addToCart(itemId, 1, [modifierIds[0], modifierIds[1]]);
    await addToCart(itemId, 3, [modifierIds[1], modifierIds[0]]); // reversed order — should still match

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId) as { quantity: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(4);
  });

  it("creates a separate cart row when modifiers differ", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [
          { name: "Cheese", priceAdjustment: 100 },
          { name: "Pepperoni", priceAdjustment: 150 },
        ],
      },
    ]);
    const userId = createUser("carol");
    await signIn(userId);

    await addToCart(itemId, 1, [modifierIds[0]]); // cheese only
    await addToCart(itemId, 1, [modifierIds[1]]); // pepperoni only

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(rows).toHaveLength(2);
  });

  it("inserts cart_item_modifiers rows alongside the cart_item", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [
          { name: "Cheese", priceAdjustment: 100 },
          { name: "Olives", priceAdjustment: 50 },
        ],
      },
    ]);
    const userId = createUser("dan");
    await signIn(userId);

    await addToCart(itemId, 1, [modifierIds[0], modifierIds[1]]);

    const cartItemRow = getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number };
    const modRows = getTestSqlite()
      .prepare("SELECT modifier_id FROM cart_item_modifiers WHERE cart_item_id = ?")
      .all(cartItemRow.id) as { modifier_id: number }[];
    expect(modRows.map((r) => r.modifier_id).sort()).toEqual(
      [modifierIds[0], modifierIds[1]].sort(),
    );
  });
});

describe("addToCart — transaction safety", () => {
  it("rolls back the cart row when modifier insert fails", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("eve");
    await signIn(userId);

    // Use a modifier ID that doesn't exist → FK constraint will fire
    const result = await addToCart(itemId, 1, [99999]);
    expect(result).toEqual({ error: "Failed to add item to cart" });

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(rows).toHaveLength(0); // transaction rolled back
  });
});

describe("quickAddToCart", () => {
  it("returns { error: 'not_authenticated' } when no session", async () => {
    const result = await quickAddToCart(1);
    expect(result).toEqual({ error: "not_authenticated" });
  });

  it("creates a new cart row (qty=1) when no modifier-less variant exists", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("frank");
    await signIn(userId);

    const result = await quickAddToCart(itemId);
    expect(result).toEqual({ success: true });

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId) as { quantity: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(1);
  });

  it("increments the existing modifier-less row instead of creating a new one", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("greta");
    await signIn(userId);

    await quickAddToCart(itemId);
    await quickAddToCart(itemId);
    await quickAddToCart(itemId);

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId) as { quantity: number }[];
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(3);
  });

  it("does NOT increment a row that has modifiers; creates a new modifier-less row instead", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [{ name: "Cheese", priceAdjustment: 100 }],
      },
    ]);
    const userId = createUser("hank");
    await signIn(userId);

    await addToCart(itemId, 1, [modifierIds[0]]); // existing row with modifiers
    await quickAddToCart(itemId); // should create new modifier-less row

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(rows).toHaveLength(2);
  });
});

// ====================================================================
// Section 5 — cart-only functions
// ====================================================================

describe("getCart", () => {
  it("returns [] when unauthenticated", async () => {
    seedHomepageFixtures();
    const result = await getCart();
    expect(result).toEqual([]);
  });

  it("returns cart items joined with menu item + category info, including modifiers + lineTotal", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [{ name: "Cheese", priceAdjustment: 100 }],
      },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 2, [modifierIds[0]]);

    const cart = await getCart();
    expect(cart).toHaveLength(1);
    const row = cart[0];
    expect(row.itemName).toBe("Pizza");
    expect(row.quantity).toBe(2);
    expect(row.modifiers).toHaveLength(1);
    expect(row.modifiers[0].name).toBe("Cheese");
    expect(row.unitPrice).toBe(1000 + 100); // base + cheese
    expect(row.lineTotal).toBe(2 * (1000 + 100));
  });

  it("does not include other users' cart items", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const alice = createUser("alice");
    const bob = createUser("bob");
    await signIn(alice);
    await addToCart(itemId, 1);
    clearMockHeadersAndCookies();
    await signIn(bob);

    const cart = await getCart();
    expect(cart).toEqual([]);
  });
});

describe("getCartCount", () => {
  it("returns 0 when unauthenticated", async () => {
    expect(await getCartCount()).toBe(0);
  });

  it("returns SUM of quantities across the user's cart rows", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const a = seedMenuItemWithModifiers(categoryIds[0], "A");
    const b = seedMenuItemWithModifiers(categoryIds[1], "B");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(a.itemId, 3);
    await addToCart(b.itemId, 2);
    expect(await getCartCount()).toBe(5);
  });
});

describe("updateCartQuantity", () => {
  it("does nothing when unauthenticated", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;
    clearMockHeadersAndCookies();
    await updateCartQuantity(cartItemId, 99);
    const row = getTestSqlite()
      .prepare("SELECT quantity FROM cart_items WHERE id = ?")
      .get(cartItemId) as { quantity: number };
    expect(row.quantity).toBe(1);
  });

  it("updates the quantity for the user's cart row", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;

    await updateCartQuantity(cartItemId, 7);
    const row = getTestSqlite()
      .prepare("SELECT quantity FROM cart_items WHERE id = ?")
      .get(cartItemId) as { quantity: number };
    expect(row.quantity).toBe(7);
  });

  it("deletes the row + modifiers when quantity goes to 0", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "X", [
      { name: "Sauce", maxSelect: 1, modifiers: [{ name: "Hot" }] },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 2, [modifierIds[0]]);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;

    await updateCartQuantity(cartItemId, 0);

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE id = ?")
      .all(cartItemId);
    const mods = getTestSqlite()
      .prepare("SELECT * FROM cart_item_modifiers WHERE cart_item_id = ?")
      .all(cartItemId);
    expect(rows).toHaveLength(0);
    expect(mods).toHaveLength(0);
  });

  it("does not affect a different user's cart row even if same cartItemId", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const alice = createUser("alice");
    await signIn(alice);
    await addToCart(itemId, 1);
    const aliceRowId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(alice) as { id: number }).id;

    clearMockHeadersAndCookies();
    const bob = createUser("bob");
    await signIn(bob);
    await updateCartQuantity(aliceRowId, 99); // not Bob's row

    const row = getTestSqlite()
      .prepare("SELECT quantity FROM cart_items WHERE id = ?")
      .get(aliceRowId) as { quantity: number };
    expect(row.quantity).toBe(1);
  });
});

describe("updateSpecialInstructions", () => {
  it("sets the instructions text on the user's cart row", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;

    await updateSpecialInstructions(cartItemId, "no onions");
    const row = getTestSqlite()
      .prepare("SELECT special_instructions FROM cart_items WHERE id = ?")
      .get(cartItemId) as { special_instructions: string | null };
    expect(row.special_instructions).toBe("no onions");
  });

  it("stores NULL when given an empty string", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;
    await updateSpecialInstructions(cartItemId, "first");
    await updateSpecialInstructions(cartItemId, "");
    const row = getTestSqlite()
      .prepare("SELECT special_instructions FROM cart_items WHERE id = ?")
      .get(cartItemId) as { special_instructions: string | null };
    expect(row.special_instructions).toBeNull();
  });
});

describe("removeFromCart", () => {
  it("deletes the cart row and its modifiers", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "X", [
      { name: "Sauce", maxSelect: 1, modifiers: [{ name: "Hot" }] },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1, [modifierIds[0]]);
    const cartItemId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(userId) as { id: number }).id;

    await removeFromCart(cartItemId);

    const rows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE id = ?")
      .all(cartItemId);
    const mods = getTestSqlite()
      .prepare("SELECT * FROM cart_item_modifiers WHERE cart_item_id = ?")
      .all(cartItemId);
    expect(rows).toHaveLength(0);
    expect(mods).toHaveLength(0);
  });

  it("is scoped to the current user — won't delete another user's row", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "X");
    const alice = createUser("alice");
    await signIn(alice);
    await addToCart(itemId, 1);
    const aliceRowId = (getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .get(alice) as { id: number }).id;

    clearMockHeadersAndCookies();
    const bob = createUser("bob");
    await signIn(bob);
    await removeFromCart(aliceRowId);

    const row = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE id = ?")
      .all(aliceRowId);
    expect(row).toHaveLength(1);
  });
});

describe("addToCartBySlug", () => {
  it("returns { error: 'item_not_found' } when slug doesn't exist", async () => {
    const result = await addToCartBySlug("does-not-exist", 1);
    expect(result).toEqual({ error: "item_not_found" });
  });

  it("delegates to addToCart when slug exists", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);

    const result = await addToCartBySlug("pizza", 2);
    expect(result).toEqual({ success: true });
    const row = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE menu_item_id = ?")
      .get(itemId) as { quantity: number };
    expect(row.quantity).toBe(2);
  });
});

describe("removeFromCartBySlug", () => {
  it("returns { error: 'not_authenticated' } when unauthenticated", async () => {
    expect(await removeFromCartBySlug("anything")).toEqual({ error: "not_authenticated" });
  });

  it("returns { error: 'item_not_found' } when slug doesn't exist", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    expect(await removeFromCartBySlug("ghost")).toEqual({ error: "item_not_found" });
  });

  it("returns { error: 'item_not_in_cart' } when slug exists but user has no rows", async () => {
    const { categoryIds } = seedHomepageFixtures();
    seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);
    expect(await removeFromCartBySlug("pizza")).toEqual({ error: "item_not_in_cart" });
  });

  it("removes all cart rows of that item for the user (and their modifiers)", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [
          { name: "Cheese", priceAdjustment: 100 },
          { name: "Pep", priceAdjustment: 200 },
        ],
      },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1, [modifierIds[0]]);
    await addToCart(itemId, 2, [modifierIds[1]]); // creates a second row (different mods)

    const before = getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(before.length).toBe(2);

    const result = await removeFromCartBySlug("pizza");
    expect(result).toEqual({ success: true });

    const after = getTestSqlite()
      .prepare("SELECT id FROM cart_items WHERE user_id = ?")
      .all(userId);
    const mods = getTestSqlite()
      .prepare("SELECT * FROM cart_item_modifiers")
      .all();
    expect(after).toEqual([]);
    expect(mods).toEqual([]);
  });
});

describe("saveUserAddress + getUserAddress", () => {
  it("getUserAddress returns null when unauthenticated", async () => {
    expect(await getUserAddress()).toBeNull();
  });

  it("writes all five fields and returns them via getUserAddress", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    await saveUserAddress({
      street: "1 Main St",
      apartment: "Apt 4B",
      city: "Townsville",
      zipCode: "12345",
      phone: "555-1234",
    });

    const address = await getUserAddress();
    expect(address).toEqual({
      street: "1 Main St",
      apartment: "Apt 4B",
      city: "Townsville",
      zipCode: "12345",
      phone: "555-1234",
    });
  });

  it("saveUserAddress is silent no-op when unauthenticated (no user row mutated)", async () => {
    const userId = createUser("alice");
    // do not sign in
    await saveUserAddress({
      street: "x",
      apartment: "",
      city: "",
      zipCode: "",
      phone: "",
    });
    const row = getTestSqlite()
      .prepare("SELECT street FROM users WHERE id = ?")
      .get(userId) as { street: string | null };
    expect(row.street).toBeNull();
  });
});

// ====================================================================
// Section 6 — placeOrder
// ====================================================================

describe("placeOrder — auth", () => {
  it("redirects to /login when unauthenticated", async () => {
    await expect(placeOrder("addr", "555", 0)).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/login");
  });
});

describe("placeOrder — empty cart", () => {
  it("returns { error: 'Cart is empty' } for an authenticated user with no cart items", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    const result = await placeOrder("1 Main St", "555", 0);
    expect(result).toEqual({ error: "Cart is empty" });
  });
});

describe("placeOrder — success path", () => {
  it("creates an order row, snapshots items + modifiers, clears the cart, and redirects to /orders/{id}", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [{ name: "Cheese", priceAdjustment: 200 }],
      },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 2, [modifierIds[0]]);

    await expect(placeOrder("1 Main St", "555", 300)).rejects.toBeInstanceOf(
      RedirectError,
    );

    // Order row
    const orders = getTestSqlite()
      .prepare("SELECT * FROM orders WHERE user_id = ?")
      .all(userId) as {
        id: number;
        total: number;
        delivery_address: string;
        delivery_phone: string;
        tip: number;
        estimated_minutes: number;
      }[];
    expect(orders).toHaveLength(1);
    const order = orders[0];
    // subtotal = 2 * (1000 base + 200 cheese) = 2400; total = 2400 + 300 tip = 2700
    expect(order.total).toBe(2700);
    expect(order.delivery_address).toBe("1 Main St");
    expect(order.delivery_phone).toBe("555");
    expect(order.tip).toBe(300);
    expect(order.estimated_minutes).toBeGreaterThanOrEqual(25);

    // Order items snapshot
    const orderItems = getTestSqlite()
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(order.id) as { item_name: string; quantity: number; unit_price: number }[];
    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].item_name).toBe("Pizza");
    expect(orderItems[0].quantity).toBe(2);
    expect(orderItems[0].unit_price).toBe(1200); // base + cheese

    // Modifier snapshot
    const orderMods = getTestSqlite()
      .prepare("SELECT * FROM order_item_modifiers")
      .all() as { modifier_name: string; price_adjustment: number }[];
    expect(orderMods).toHaveLength(1);
    expect(orderMods[0].modifier_name).toBe("Cheese");
    expect(orderMods[0].price_adjustment).toBe(200);

    // Cart cleared
    const cartRows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    const cartMods = getTestSqlite().prepare("SELECT * FROM cart_item_modifiers").all();
    expect(cartRows).toHaveLength(0);
    expect(cartMods).toHaveLength(0);

    // Redirect target
    expect(redirectCalls.some((r) => r.startsWith("/orders/"))).toBe(true);
  });

  it("places an order with no tip and stores tip = 0", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Burger");
    const userId = createUser("bob");
    await signIn(userId);
    await addToCart(itemId, 1);

    await expect(placeOrder("addr", "phone")).rejects.toBeInstanceOf(RedirectError);

    const order = getTestSqlite()
      .prepare("SELECT total, tip FROM orders WHERE user_id = ?")
      .get(userId) as { total: number; tip: number };
    expect(order.total).toBe(1000);
    expect(order.tip).toBe(0);
  });
});

// ====================================================================
// Section 8 — getOrders / getOrderById / reorderFromOrder
// ====================================================================

function insertOrderRow(userId: number, total: number, createdAt?: string): number {
  const result = getTestSqlite()
    .prepare(
      "INSERT INTO orders (user_id, status, total, tip, created_at) VALUES (?, 'confirmed', ?, 0, ?)",
    )
    .run(userId, total, createdAt ?? new Date().toISOString());
  return Number(result.lastInsertRowid);
}

describe("getOrders", () => {
  it("returns [] when unauthenticated", async () => {
    expect(await getOrders()).toEqual([]);
  });

  it("returns own orders DESC by createdAt", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    insertOrderRow(userId, 1000, "2026-01-01T00:00:00Z");
    insertOrderRow(userId, 2000, "2026-02-01T00:00:00Z");
    insertOrderRow(userId, 3000, "2026-01-15T00:00:00Z");

    const orders = await getOrders();
    expect(orders.map((o) => o.total)).toEqual([2000, 3000, 1000]);
  });

  it("does not include another user's orders", async () => {
    const alice = createUser("alice");
    const bob = createUser("bob");
    insertOrderRow(alice, 1000);
    insertOrderRow(bob, 9999);

    await signIn(alice);
    const orders = await getOrders();
    expect(orders.map((o) => o.total)).toEqual([1000]);
  });
});

describe("getOrderById", () => {
  it("returns null when unauthenticated", async () => {
    expect(await getOrderById(1)).toBeNull();
  });

  it("returns null when order does not exist", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    expect(await getOrderById(99999)).toBeNull();
  });

  it("returns null when order belongs to another user", async () => {
    const alice = createUser("alice");
    const bob = createUser("bob");
    const aliceOrderId = insertOrderRow(alice, 1000);

    await signIn(bob);
    expect(await getOrderById(aliceOrderId)).toBeNull();
  });

  it("returns the order with nested items[].modifiers[]", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [{ name: "Cheese", priceAdjustment: 200 }],
      },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1, [modifierIds[0]]);
    // placeOrder will throw RedirectError; ignore via try
    try {
      await placeOrder("addr", "555", 0);
    } catch {
      // expected (NEXT_REDIRECT sentinel)
    }

    const orderRow = getTestSqlite()
      .prepare("SELECT id FROM orders WHERE user_id = ?")
      .get(userId) as { id: number };
    const order = await getOrderById(orderRow.id);
    expect(order).not.toBeNull();
    expect(order!.items).toHaveLength(1);
    expect(order!.items[0].itemName).toBe("Pizza");
    expect(order!.items[0].modifiers).toHaveLength(1);
    expect(order!.items[0].modifiers[0].modifierName).toBe("Cheese");
  });
});

describe("reorderFromOrder", () => {
  it("redirects to /login when unauthenticated", async () => {
    await expect(reorderFromOrder(1)).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/login");
  });

  it("returns { error: 'Order not found' } when the order doesn't belong to the user", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    const result = await reorderFromOrder(99999);
    expect(result).toEqual({ error: "Order not found" });
  });

  it("inserts available items + modifiers back into the cart and redirects to /cart", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId: itemA, modifierIds: modsA } = seedMenuItemWithModifiers(
      categoryIds[0],
      "Pizza",
      [
        {
          name: "Toppings",
          maxSelect: 3,
          modifiers: [{ name: "Cheese", priceAdjustment: 200 }],
        },
      ],
    );
    const { itemId: itemB } = seedMenuItemWithModifiers(categoryIds[0], "Burger");

    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemA, 2, [modsA[0]]);
    await addToCart(itemB, 1);
    try {
      await placeOrder("addr", "555", 0);
    } catch {
      // expected redirect
    }
    clearRedirects();

    const orderRow = getTestSqlite()
      .prepare("SELECT id FROM orders WHERE user_id = ?")
      .get(userId) as { id: number };

    // Cart was cleared by placeOrder; reorderFromOrder should refill it
    await expect(reorderFromOrder(orderRow.id)).rejects.toBeInstanceOf(RedirectError);
    expect(redirectCalls).toContain("/cart");

    const cartRows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId) as { quantity: number; menu_item_id: number }[];
    expect(cartRows).toHaveLength(2);

    const cartMods = getTestSqlite()
      .prepare("SELECT * FROM cart_item_modifiers")
      .all();
    expect(cartMods).toHaveLength(1);
  });

  it("skips items that are no longer available", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    try {
      await placeOrder("addr", "555", 0);
    } catch {
      // expected
    }
    clearRedirects();

    // Mark the menu item as unavailable
    getTestSqlite()
      .prepare("UPDATE menu_items SET is_available = 0 WHERE id = ?")
      .run(itemId);

    const orderRow = getTestSqlite()
      .prepare("SELECT id FROM orders WHERE user_id = ?")
      .get(userId) as { id: number };

    await expect(reorderFromOrder(orderRow.id)).rejects.toBeInstanceOf(RedirectError);

    const cartRows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(cartRows).toHaveLength(0);
  });
});

describe("placeOrder — rollback on failure", () => {
  it("rolls back the order rows if a modifier insert fails (DB constraint)", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "X", [
      {
        name: "Sauce",
        maxSelect: 1,
        modifiers: [{ name: "Hot" }],
      },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1, [modifierIds[0]]);

    // Force the order_item_modifiers insert to fail by dropping the table mid-test.
    const sqlite = getTestSqlite();
    sqlite.exec("DROP TABLE order_item_modifiers;");
    try {
      const result = await placeOrder("addr", "phone", 0);
      expect(result).toEqual({ error: "Failed to place order" });

      // No order should remain (transaction rolled back)
      const orders = sqlite
        .prepare("SELECT * FROM orders WHERE user_id = ?")
        .all(userId);
      expect(orders).toHaveLength(0);

      // Cart still intact
      const cart = sqlite
        .prepare("SELECT * FROM cart_items WHERE user_id = ?")
        .all(userId);
      expect(cart).toHaveLength(1);
    } finally {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS order_item_modifiers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_item_id INTEGER NOT NULL REFERENCES order_items(id),
          modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
          modifier_name TEXT NOT NULL,
          price_adjustment INTEGER NOT NULL
        );
      `);
    }
  });
});

describe("placeOrderFromAI", () => {
  it("returns { error: 'Not authenticated' } when no session", async () => {
    const result = await placeOrderFromAI();
    expect(result).toEqual({ error: "Not authenticated" });
  });

  it("returns { error: 'Cart is empty' } when the user has nothing in the cart", async () => {
    const userId = createUser("alice");
    await signIn(userId);
    const result = await placeOrderFromAI();
    expect(result).toEqual({ error: "Cart is empty" });
  });

  it("returns { error: 'No saved delivery address' } when the user has no saved address", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);

    const result = await placeOrderFromAI();
    expect(result).toEqual({ error: "No saved delivery address" });
  });

  it("creates the order, clears the cart, and returns { orderId, estimatedMinutes }", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(
      categoryIds[0],
      "Pizza",
      [{ name: "Toppings", maxSelect: 3, modifiers: [{ name: "Cheese", priceAdjustment: 200 }] }],
    );
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 2, [modifierIds[0]]);
    await saveUserAddress({
      street: "1 Main St",
      apartment: "",
      city: "Springfield",
      zipCode: "12345",
      phone: "555-0100",
    });

    const result = await placeOrderFromAI(300);
    expect(result).toMatchObject({
      orderId: expect.any(Number),
      estimatedMinutes: expect.any(Number),
    });

    // Cart cleared
    const cartRows = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(cartRows).toHaveLength(0);

    // Order persisted with composed delivery address + tip + correct status
    const orderId = (result as { orderId: number }).orderId;
    const row = getTestSqlite()
      .prepare("SELECT * FROM orders WHERE id = ?")
      .get(orderId) as { delivery_address: string; delivery_phone: string; tip: number; status: string };
    expect(row.delivery_address).toBe("1 Main St, Springfield 12345");
    expect(row.delivery_phone).toBe("555-0100");
    expect(row.tip).toBe(300);
    expect(row.status).toBe("confirmed");

    // Order items + modifiers copied
    const orderItemRows = getTestSqlite()
      .prepare("SELECT * FROM order_items WHERE order_id = ?")
      .all(orderId) as { item_name: string; quantity: number }[];
    expect(orderItemRows).toHaveLength(1);
    expect(orderItemRows[0].item_name).toBe("Pizza");
    expect(orderItemRows[0].quantity).toBe(2);

    const orderModRows = getTestSqlite()
      .prepare("SELECT * FROM order_item_modifiers")
      .all() as { modifier_name: string }[];
    expect(orderModRows).toHaveLength(1);
    expect(orderModRows[0].modifier_name).toBe("Cheese");
  });

  it("includes the apartment in the composed delivery address when provided", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    await saveUserAddress({
      street: "1 Main St",
      apartment: "Apt 5B",
      city: "Springfield",
      zipCode: "12345",
      phone: "555-0100",
    });

    const result = await placeOrderFromAI();
    const orderId = (result as { orderId: number }).orderId;
    const row = getTestSqlite()
      .prepare("SELECT delivery_address FROM orders WHERE id = ?")
      .get(orderId) as { delivery_address: string };
    expect(row.delivery_address).toBe("1 Main St, Apt 5B, Springfield 12345");
  });

  it("creates one order_items row per distinct cart item and atomically clears the cart", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId: pizzaId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const { itemId: burgerId } = seedMenuItemWithModifiers(categoryIds[0], "Burger");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(pizzaId, 2);
    await addToCart(burgerId, 1);
    await saveUserAddress({
      street: "1 Main St",
      apartment: "",
      city: "Springfield",
      zipCode: "12345",
      phone: "555-0100",
    });

    const result = await placeOrderFromAI();
    expect(result).toMatchObject({ orderId: expect.any(Number) });

    const orderId = (result as { orderId: number }).orderId;
    const itemRows = getTestSqlite()
      .prepare("SELECT item_name, quantity FROM order_items WHERE order_id = ? ORDER BY id")
      .all(orderId) as { item_name: string; quantity: number }[];
    expect(itemRows).toHaveLength(2);
    expect(itemRows.map((r) => r.item_name).sort()).toEqual(["Burger", "Pizza"]);

    // Cart is fully cleared
    const remaining = getTestSqlite()
      .prepare("SELECT * FROM cart_items WHERE user_id = ?")
      .all(userId);
    expect(remaining).toHaveLength(0);
  });

  it("defaults tip to 0 when called with no argument", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId } = seedMenuItemWithModifiers(categoryIds[0], "Pizza");
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1);
    await saveUserAddress({
      street: "1",
      apartment: "",
      city: "a",
      zipCode: "1",
      phone: "",
    });

    const result = await placeOrderFromAI();
    const orderId = (result as { orderId: number }).orderId;
    const row = getTestSqlite()
      .prepare("SELECT tip FROM orders WHERE id = ?")
      .get(orderId) as { tip: number };
    expect(row.tip).toBe(0);
  });

  it("rolls back the order if a downstream insert fails", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { itemId, modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Pizza", [
      { name: "S", maxSelect: 1, modifiers: [{ name: "X" }] },
    ]);
    const userId = createUser("alice");
    await signIn(userId);
    await addToCart(itemId, 1, [modifierIds[0]]);
    await saveUserAddress({
      street: "1",
      apartment: "",
      city: "a",
      zipCode: "1",
      phone: "",
    });

    const sqlite = getTestSqlite();
    sqlite.exec("DROP TABLE order_item_modifiers;");
    try {
      const result = await placeOrderFromAI();
      expect(result).toEqual({ error: "Failed to place order" });

      // No order should remain (transaction rolled back)
      const ordersRows = sqlite
        .prepare("SELECT * FROM orders WHERE user_id = ?")
        .all(userId);
      expect(ordersRows).toHaveLength(0);

      // Cart still intact
      const cart = sqlite
        .prepare("SELECT * FROM cart_items WHERE user_id = ?")
        .all(userId);
      expect(cart).toHaveLength(1);
    } finally {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS order_item_modifiers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_item_id INTEGER NOT NULL REFERENCES order_items(id),
          modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
          modifier_name TEXT NOT NULL,
          price_adjustment INTEGER NOT NULL
        );
      `);
    }
  });
});
