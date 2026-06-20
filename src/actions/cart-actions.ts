"use server";

// Thin server-action wrappers over the framework-agnostic domain core
// (src/lib/core/cart.ts + orders.ts). Responsibilities kept HERE at the edge:
//   • identity — resolve userId from the session cookie (requireUser)
//   • Next cache — revalidatePath / redirect
// All cart/order business logic lives in the core, shared with the MCP server.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyAuthAndRefresh } from "@/lib/auth";
import { db } from "@/db";
import { menuItems, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as cartCore from "@/lib/core/cart";
import * as ordersCore from "@/lib/core/orders";

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
  return cartCore.getCart(userId);
}

// ── Get Cart Count ───────────────────────────────────────────────────────────
export async function getCartCount() {
  const userId = await requireUser();
  if (!userId) return 0;
  return cartCore.getCartCount(userId);
}

// ── Add to Cart ──────────────────────────────────────────────────────────────
export async function addToCart(menuItemId: number, quantity: number = 1, modifierIds: number[] = []) {
  const userId = await requireUser();
  if (!userId) return { error: "not_authenticated" };

  const result = await cartCore.addToCart(userId, menuItemId, quantity, modifierIds);
  if (!("error" in result)) revalidatePath("/", "layout");
  return result;
}

// ── Add to Cart by Slug (AI card quick-add) ──────────────────────────────────
export async function addToCartBySlug(slug: string, quantity: number = 1, modifierIds: number[] = []) {
  const item = db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.slug, slug))
    .get();
  if (!item) return { error: "item_not_found" };
  return addToCart(item.id, quantity, modifierIds);
}

// ── Quick Add (no modifiers) ─────────────────────────────────────────────────
export async function quickAddToCart(menuItemId: number) {
  const userId = await requireUser();
  if (!userId) return { error: "not_authenticated" };

  const result = await cartCore.quickAddToCart(userId, menuItemId);
  if (!("error" in result)) revalidatePath("/", "layout");
  return result;
}

// ── Update Quantity ──────────────────────────────────────────────────────────
export async function updateCartQuantity(cartItemId: number, quantity: number) {
  const userId = await requireUser();
  if (!userId) return;
  await cartCore.updateCartQuantity(userId, cartItemId, quantity);
  revalidatePath("/cart");
}

// ── Update Special Instructions ──────────────────────────────────────────────
export async function updateSpecialInstructions(cartItemId: number, instructions: string) {
  const userId = await requireUser();
  if (!userId) return;
  await cartCore.updateSpecialInstructions(userId, cartItemId, instructions);
  revalidatePath("/cart");
}

// ── Remove from Cart by Slug (AI assistant) ──────────────────────────────────
export async function removeFromCartBySlug(slug: string) {
  const userId = await requireUser();
  if (!userId) return { error: "not_authenticated" };

  const result = await cartCore.removeFromCartBySlug(userId, slug);
  if (!("error" in result)) revalidatePath("/", "layout");
  return result;
}

// ── Remove from Cart ─────────────────────────────────────────────────────────
export async function removeFromCart(cartItemId: number) {
  const userId = await requireUser();
  if (!userId) return;
  await cartCore.removeFromCart(userId, cartItemId);
  revalidatePath("/", "layout");
}

// ── Place Order ──────────────────────────────────────────────────────────────
export async function placeOrder(deliveryAddress?: string, deliveryPhone?: string, tip?: number) {
  const userId = await requireUser();
  if (!userId) redirect("/login");

  const result = await ordersCore.placeOrder(userId, deliveryAddress, deliveryPhone, tip);
  if ("error" in result) return result;

  revalidatePath("/", "layout");
  redirect(`/orders/${result.orderId}`);
}

// ── Place Order from AI (no redirect, returns orderId) ───────────────────────
export async function placeOrderFromAI(tip?: number) {
  const userId = await requireUser();
  if (!userId) return { error: "Not authenticated" };

  const result = await ordersCore.placeOrderFromAI(userId, tip);
  if ("error" in result) return result;

  revalidatePath("/", "layout");
  return { orderId: result.orderId, estimatedMinutes: result.estimatedMinutes };
}

// ── Reorder ──────────────────────────────────────────────────────────────────
export async function reorderFromOrder(orderId: number) {
  const userId = await requireUser();
  if (!userId) redirect("/login");

  const result = await ordersCore.reorderFromOrder(userId, orderId);
  if ("error" in result) return result;

  revalidatePath("/", "layout");
  redirect("/cart");
}

// ── Get Orders ───────────────────────────────────────────────────────────────
export async function getOrders() {
  const userId = await requireUser();
  if (!userId) return [];
  return ordersCore.getOrders(userId);
}

// ── Get Order by ID ──────────────────────────────────────────────────────────
export async function getOrderById(orderId: number) {
  const userId = await requireUser();
  if (!userId) return null;
  return ordersCore.getOrderById(userId, orderId);
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
