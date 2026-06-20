// ── Orders domain core ───────────────────────────────────────────────────────
// Framework-agnostic order logic. Identity injected as `userId`; no cookies(),
// no redirect()/revalidatePath() (the web wrappers in cart-actions.ts add those).
// Shared by the Next.js app and the MCP server.

import { db } from "@/db";
import {
  cartItems, cartItemModifiers, orders, orderItems, orderItemModifiers, menuItems, users,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { withTransaction } from "@/lib/db/transaction";
import { getCart } from "./cart";

function estimateMinutes() {
  return 25 + Math.floor(Math.random() * 20);
}

// ── Place Order (explicit address) ────────────────────────────────────────────
export async function placeOrder(
  userId: number,
  deliveryAddress?: string,
  deliveryPhone?: string,
  tip?: number,
) {
  try {
    const cart = await getCart(userId);
    if (cart.length === 0) return { error: "Cart is empty" };

    const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
    const tipAmount = tip ?? 0;
    const total = subtotal + tipAmount;
    const estimatedMinutes = estimateMinutes();

    const orderId = withTransaction(() => {
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

      // Clear cart inside the transaction (rolls back with the order if anything fails)
      const userCartItems = db.select({ id: cartItems.id }).from(cartItems).where(eq(cartItems.userId, userId)).all();
      for (const ci of userCartItems) {
        db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, ci.id)).run();
      }
      db.delete(cartItems).where(eq(cartItems.userId, userId)).run();

      return order.id;
    });

    return { orderId, estimatedMinutes, total };
  } catch {
    return { error: "Failed to place order" };
  }
}

// ── Place Order from saved address ────────────────────────────────────────────
// Check order matches the original action: cart-empty takes precedence over
// missing-address.
export async function placeOrderFromAI(userId: number, tip?: number) {
  const cart = await getCart(userId);
  if (cart.length === 0) return { error: "Cart is empty" };

  const userData = db.select({
    street: users.street,
    apartment: users.apartment,
    city: users.city,
    zipCode: users.zipCode,
    phone: users.phone,
  }).from(users).where(eq(users.id, userId)).get();

  if (!userData?.street) return { error: "No saved delivery address" };

  const deliveryAddress = `${userData.street}${userData.apartment ? `, ${userData.apartment}` : ""}, ${userData.city} ${userData.zipCode}`;
  const deliveryPhone = userData.phone || undefined;

  return placeOrder(userId, deliveryAddress, deliveryPhone, tip);
}

// ── Get Orders ─────────────────────────────────────────────────────────────────
export async function getOrders(userId: number) {
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
export async function getOrderById(userId: number, orderId: number) {
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

// ── Reorder ──────────────────────────────────────────────────────────────────
export async function reorderFromOrder(userId: number, orderId: number) {
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

    return { success: true };
  } catch {
    return { error: "Failed to reorder" };
  }
}
