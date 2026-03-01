import { db } from "@/db";
import { cartItems } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Get cart count by userId directly (no auth check).
 * Used in root layout where auth is already verified.
 */
export function getCartCountForUser(userId: number): number {
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
