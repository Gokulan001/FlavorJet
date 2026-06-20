// ── Cart domain core ─────────────────────────────────────────────────────────
// Framework-agnostic cart logic. Identity is INJECTED as `userId` — no cookies(),
// no "use server", no revalidatePath()/redirect() (those are Next concerns handled
// by the thin server-action wrappers in src/actions/cart-actions.ts).
//
// Two callers share this module:
//   • the Next.js app — wrappers resolve userId from the session cookie
//   • the MCP server  — resolves userId from its login tool / env session
//
// Behaviour is identical to the original server actions; only identity resolution
// and Next cache invalidation are lifted out to the edges.

import { db } from "@/db";
import {
  cartItems, cartItemModifiers, menuItems, modifiers, modifierGroups, categories,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { withTransaction } from "@/lib/db/transaction";

// ── Get Cart ───────────────────────────────────────────────────────────────
export async function getCart(userId: number) {
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
export async function getCartCount(userId: number) {
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
export async function addToCart(
  userId: number,
  menuItemId: number,
  quantity: number = 1,
  modifierIds: number[] = [],
) {
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

    // Atomic: insert cart item + modifiers in one transaction
    withTransaction(() => {
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
    });

    return { success: true };
  } catch {
    return { error: "Failed to add item to cart" };
  }
}

// ── Add to Cart by Slug ───────────────────────────────────────────────────────
export async function addToCartBySlug(
  userId: number,
  slug: string,
  quantity: number = 1,
  modifierIds: number[] = [],
) {
  const item = db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(eq(menuItems.slug, slug))
    .get();
  if (!item) return { error: "item_not_found" };
  return addToCart(userId, item.id, quantity, modifierIds);
}

// ── Quick Add (no modifiers) ─────────────────────────────────────────────────
export async function quickAddToCart(userId: number, menuItemId: number) {
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

    return { success: true };
  } catch {
    return { error: "Failed to add item to cart" };
  }
}

// ── Update Quantity ──────────────────────────────────────────────────────────
export async function updateCartQuantity(userId: number, cartItemId: number, quantity: number) {
  try {
    if (quantity <= 0) {
      db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, cartItemId)).run();
      db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();
    } else {
      db.update(cartItems).set({ quantity }).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();
    }
  } catch {
    // prevent hang
  }
}

// ── Update Special Instructions ──────────────────────────────────────────────
export async function updateSpecialInstructions(userId: number, cartItemId: number, instructions: string) {
  try {
    db.update(cartItems)
      .set({ specialInstructions: instructions || null })
      .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)))
      .run();
  } catch {
    // prevent hang
  }
}

// ── Remove from Cart by Slug ──────────────────────────────────────────────────
export async function removeFromCartBySlug(userId: number, slug: string) {
  try {
    const item = db
      .select({ id: menuItems.id })
      .from(menuItems)
      .where(eq(menuItems.slug, slug))
      .get();
    if (!item) return { error: "item_not_found" };

    const userCartItems = db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.menuItemId, item.id)))
      .all();

    if (userCartItems.length === 0) return { error: "item_not_in_cart" };

    for (const ci of userCartItems) {
      db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, ci.id)).run();
      db.delete(cartItems).where(eq(cartItems.id, ci.id)).run();
    }

    return { success: true };
  } catch {
    return { error: "Failed to remove item from cart" };
  }
}

// ── Remove from Cart ─────────────────────────────────────────────────────────
export async function removeFromCart(userId: number, cartItemId: number) {
  try {
    db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, cartItemId)).run();
    db.delete(cartItems).where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId))).run();
  } catch {
    // prevent hang
  }
}

// ── Update an item's modifiers in place ──────────────────────────────────────
// Replaces the full modifier set on a single cart line, keeping the item in the
// cart. Targets the line by its id (modifier sets make slugs ambiguous).
// Phase 1 note: does NOT merge with a different line that happens to end up
// with the same modifiers — it just sets this line's modifiers.
export async function updateCartItemModifiers(
  userId: number,
  cartItemId: number,
  modifierIds: number[],
) {
  try {
    // Ownership check — the line must belong to this user.
    const owned = db
      .select({ id: cartItems.id })
      .from(cartItems)
      .where(and(eq(cartItems.id, cartItemId), eq(cartItems.userId, userId)))
      .get();
    if (!owned) return { error: "item_not_in_cart" };

    // Atomic: clear existing modifiers for this line, then set the new ones.
    withTransaction(() => {
      db.delete(cartItemModifiers).where(eq(cartItemModifiers.cartItemId, cartItemId)).run();
      for (const modId of modifierIds) {
        db.insert(cartItemModifiers).values({ cartItemId, modifierId: modId }).run();
      }
    });

    return { success: true };
  } catch {
    return { error: "Failed to update item modifiers" };
  }
}
