import { sqlite } from "@/db";

/**
 * Wraps multiple SQLite operations in an atomic transaction.
 * If any operation throws, all changes are rolled back.
 * Returns the callback's return value.
 */
export function withTransaction<T>(fn: () => T): T {
  const transaction = sqlite.transaction(() => fn());
  return transaction();
}
