"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyAuthAndRefresh } from "@/lib/auth";
import { db } from "@/db";
import {
  cartItems, cartItemModifiers, menuItems, modifiers, modifierGroups,
  orders, orderItems, orderItemModifiers, users, categories,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Helper: single auth check per action (uses cookie-refreshing version) ────
async function requireUser() {
  const { user } = await verifyAuthAndRefresh();
  if (!user) return null;
  return Number(user.id);
}

// ── Get Cart ─────────────────────────────────────────────────────────────────
export async function getCart() {
  const userId = await requireUser();
  if (!userId) return [];

  try {
    const items = db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        specialInstructions: cartItems.specialInstructions,
        menuItemId: cartItems.menuItemId,
        itemName: menuItems.name,
        itemSlug: menuItems.slug,
        itemPrice: menuItems.price,
        itemImage: menuItems.imageUrl,
        categoryId: menuItems.categoryId,
        categorySlug: categories.slug,
      })
      .from(cartItems)
      .innerJoin(menuItems, eq(cartItems.menuItemId, menuItems.id))
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(eq(cartItems.userId, userId))
      .all();

    const result = items.map((item) => {
      const itemModifiers = db
        .select({
          id: modifiers.id,
          name: modifiers.name,
          priceAdjustment: modifiers.priceAdjustment,
          groupName: modifierGroups.name,
        })
        .from(cartItemModifiers)
        .innerJoin(modifiers, eq(cartItemModifiers.modifierId, modifiers.id))
        .innerJoin(modifierGroups, eq(modifiers.modifierGroupId, modifierGroups.id))
        .where(eq(cartItemModifiers.cartItemId, item.id))
        .all();

      const modifierTotal = itemModifiers.reduce((sum, m) => sum + m.priceAdjustment, 0);

      return {
        ...item,
        modifiers: itemModifiers,
        unitPrice: item.itemPrice + modifierTotal,
        lineTotal: (item.itemPrice + modifierTotal) * item.quantity,
      };
    });

    return result;
  } catch {
    return [];
  }
}

// ── Get Cart Count ───────────────────────────────────────────────────────────
export async function getCartCount() {
  const userId = await requireUser();
  if (!userId) return 0;

  try {
    const result = db
      .select({ total: sql<number>`SUM(${cartItems.quantity})` })
      .from(cartItems)
      .where(eq(cartItems.userId, userId))
      .get();
    return result?.total ?? 0;
  } catch {
    return 0;
  }
}

// ── Add to Cart ──────────────────────────────────────────────────────────────
// If an item with the exact same modifiers already exists, increase quantity.
// If modifiers differ, add as a new cart item.
export async function addToCart(menuItemId: number, quantity: number = 1, modifierIds: number[] = []) {
  const userId = await requireUser();
  if (!userId) return { error: "not_authenticated" };

  try {
    const sortedMods = [...modifierIds].sort((a, b) => a - b);

    // Check existing cart items for this menu item
    const existing = db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.menuItemId, menuItemId)))
      .all();

    // Find one with exact same modifiers
    const match = existing.find((item) => {
      const itemMods = db
        .select({ modifierId: cartItemModifiers.modifierId })
        .from(cartItemModifiers)
        .where(eq(cartItemModifiers.cartItemId, item.id))
        .all()
        .map((m) => m.modifierId)
        .sort((a, b) => a - b);

      if (itemMods.length !== sortedMods.length) return false;
      return itemMods.every((id, i) => id === sortedMods[i]);
    });

    if (match) {
      // Same item + same modifiers → just bump quantity
      db.update(cartItems)
        .set({ quantity: match.quantity + quantity })
        .where(eq(cartItems.id, match.id))
        .run();
    } else {
      // Different modifiers → new cart item
      const cartItem = db.insert(cartItems).values({
        userId,
        menuItemId,
        quantity,
      }).returning({ id: cartItems.id }).get();

      for (const modId of modifierIds) {
        db.insert(cartItemModifiers).values({
          cartItemId: cartItem.id,
          modifierId: modId,
        }).run();
      }
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to add item to cart" };
  }
}

// ── Quick Add (no modifiers) ─────────────────────────────────────────────────
export async function quickAddToCart(menuItemId: number) {
  const userId = await requireUser();
  if (!userId) return { error: "not_authenticated" };

  try {
    const existing = db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.menuItemId, menuItemId)))
      .all();

    const noModItem = existing.find((item) => {
      const mods = db.select().from(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, item.id)).all();
      return mods.length === 0;
    });

    if (noModItem) {
      db.update(cartItems).set({ quantity: noModItem.quantity + 1 }).where(eq(cartItems.id, noModItem.id)).run();
    } else {
      db.insert(cartItems).values({ userId, menuItemId, quantity: 1 }).run();
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { error: "Failed to add item to cart" };
  }
}

// ── Update Quantity ──────────────────────────────────────────────────────────
export async function updateCartQuantity(cartItemId: number, quantity: number) {
  const userId = await requireUser();
  if (!userId) return;

  try {
    if (quantity <= 0) {
      db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, cartItemId)).run();
      db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();
    } else {
      db.update(cartItems).set({ quantity }).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();
    }

    revalidatePath("/cart");
  } catch {
    // prevent hang
  }
}

// ── Update Special Instructions ──────────────────────────────────────────────
export async function updateSpecialInstructions(cartItemId: number, instructions: string) {
  const userId = await requireUser();
  if (!userId) return;

  try {
    db.update(cartItems)
      .set({ specialInstructions: instructions || null })
      .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)))
      .run();

    revalidatePath("/cart");
  } catch {
    // prevent hang
  }
}

// ── Remove from Cart ─────────────────────────────────────────────────────────
export async function removeFromCart(cartItemId: number) {
  const userId = await requireUser();
  if (!userId) return;

  try {
    db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, cartItemId)).run();
    db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();

    revalidatePath("/", "layout");
  } catch {
    // prevent hang
  }
}

// ── Place Order ──────────────────────────────────────────────────────────────
export async function placeOrder(deliveryAddress?: string, deliveryPhone?: string, tip?: number) {
  const userId = await requireUser();
  if (!userId) redirect("/login");

  try {
    const cart = await getCart();
    if (cart.length === 0) return { error: "Cart is empty" };

    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const tipAmount = tip ?? 0;
    const total = subtotal + tipAmount;

    const estimatedMinutes = 25 + Math.floor(Math.random() * 20);

    const order = db.insert(orders).values({
      userId,
      status: "confirmed",
      total,
      deliveryAddress: deliveryAddress || null,
      deliveryPhone: deliveryPhone || null,
      tip: tipAmount,
      estimatedMinutes,
    }).returning({ id: orders.id }).get();

    for (const item of cart) {
      const orderItem = db.insert(orderItems).values({
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemName: item.itemName,
        specialInstructions: item.specialInstructions || null,
      }).returning({ id: orderItems.id }).get();

      for (const mod of item.modifiers) {
        db.insert(orderItemModifiers).values({
          orderItemId: orderItem.id,
          modifierId: mod.id,
          modifierName: mod.name,
          priceAdjustment: mod.priceAdjustment,
        }).run();
      }
    }

    // Clear cart
    const userCartItems = db.select({ id: cartItems.id }).from(cartItems).where(eq(cartItems.userId, userId)).all();
    for (const ci of userCartItems) {
      db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, ci.id)).run();
    }
    db.delete(cartItems).where(eq(cartItems.userId, userId)).run();

    revalidatePath("/", "layout");
    redirect(`/orders/${order.id}`);
  } catch (e) {
    // redirect() throws a special NEXT_REDIRECT error — must re-throw it
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: "Failed to place order" };
  }
}

// ── Reorder ──────────────────────────────────────────────────────────────────
export async function reorderFromOrder(orderId: number) {
  const userId = await requireUser();
  if (!userId) redirect("/login");

  try {
    const order = db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId))).get();
    if (!order) return { error: "Order not found" };

    const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();

    for (const item of items) {
      const available = db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId)).get();
      if (!available || !available.isAvailable) continue;

      const cartItem = db.insert(cartItems).values({
        userId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || null,
      }).returning({ id: cartItems.id }).get();

      const itemMods = db.select().from(orderItemModifiers).where(eq(orderItemModifiers.orderItemId, item.id)).all();
      for (const mod of itemMods) {
        db.insert(cartItemModifiers).values({
          cartItemId: cartItem.id,
          modifierId: mod.modifierId,
        }).run();
      }
    }

    revalidatePath("/", "layout");
    redirect("/cart");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e;
    return { error: "Failed to reorder" };
  }
}

// ── Get Orders ───────────────────────────────────────────────────────────────
export async function getOrders() {
  const userId = await requireUser();
  if (!userId) return [];

  try {
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(sql`${orders.createdAt} DESC`)
      .all();
  } catch {
    return [];
  }
}

// ── Get Order by ID ──────────────────────────────────────────────────────────
export async function getOrderById(orderId: number) {
  const userId = await requireUser();
  if (!userId) return null;

  try {
    const order = db.select().from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, userId))).get();
    if (!order) return null;

    const items = db.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all();

    const itemsWithModifiers = items.map((item) => {
      const mods = db.select().from(orderItemModifiers).where(eq(orderItemModifiers.orderItemId, item.id)).all();
      return { ...item, modifiers: mods };
    });

    return { ...order, items: itemsWithModifiers };
  } catch {
    return null;
  }
}

// ── Save User Address ────────────────────────────────────────────────────────
export async function saveUserAddress(address: { street: string; apartment: string; city: string; zipCode: string; phone: string }) {
  const userId = await requireUser();
  if (!userId) return;

  try {
    db.update(users).set({
      street: address.street,
      apartment: address.apartment,
      city: address.city,
      zipCode: address.zipCode,
      phone: address.phone,
    }).where(eq(users.id, userId)).run();

    revalidatePath("/checkout");
    revalidatePath("/profile");
  } catch {
    // prevent hang
  }
}

// ── Get User Address ─────────────────────────────────────────────────────────
export async function getUserAddress() {
  const userId = await requireUser();
  if (!userId) return null;

  try {
    const userData = db.select({
      street: users.street,
      apartment: users.apartment,
      city: users.city,
      zipCode: users.zipCode,
      phone: users.phone,
    }).from(users).where(eq(users.id, userId)).get();

    return userData || null;
  } catch {
    return null;
  }
}
