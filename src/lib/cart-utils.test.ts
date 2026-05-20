import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { getCartCountForUser } = await import("./cart-utils");
const {
  resetTestDb,
  seedHomepageFixtures,
  seedCartItems,
  getTestSqlite,
} = await import("@/test/db");

function createUser(username: string): number {
  const result = getTestSqlite()
    .prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id",
    )
    .get(username, `${username}@test.com`, "hash:salt") as { id: number };
  return result.id;
}

beforeEach(() => {
  resetTestDb();
});

describe("getCartCountForUser", () => {
  it("returns 0 when the user has no cart rows", () => {
    seedHomepageFixtures();
    const userId = createUser("alice");
    expect(getCartCountForUser(userId)).toBe(0);
  });

  it("returns the SUM of quantities across the user's cart rows", () => {
    seedHomepageFixtures();
    const userId = createUser("bob");
    const menuItemRow = getTestSqlite()
      .prepare("SELECT id FROM menu_items ORDER BY id LIMIT 1")
      .get() as { id: number };

    seedCartItems(userId, [
      { menuItemId: menuItemRow.id, quantity: 2 },
      { menuItemId: menuItemRow.id, quantity: 3 },
      { menuItemId: menuItemRow.id, quantity: 1 },
    ]);

    expect(getCartCountForUser(userId)).toBe(6);
  });

  it("does not count cart rows belonging to other users", () => {
    seedHomepageFixtures();
    const alice = createUser("alice");
    const bob = createUser("bob");
    const menuItemRow = getTestSqlite()
      .prepare("SELECT id FROM menu_items ORDER BY id LIMIT 1")
      .get() as { id: number };

    seedCartItems(alice, [{ menuItemId: menuItemRow.id, quantity: 5 }]);
    seedCartItems(bob, [{ menuItemId: menuItemRow.id, quantity: 7 }]);

    expect(getCartCountForUser(alice)).toBe(5);
    expect(getCartCountForUser(bob)).toBe(7);
  });

  it("returns 0 when the userId has no matching user (no error thrown)", () => {
    expect(getCartCountForUser(9999)).toBe(0);
  });

  it("returns 0 when the DB throws (try/catch fallback)", async () => {
    // Drop the cart_items table to force a SQL error, then restore for other tests
    const sqlite = getTestSqlite();
    sqlite.exec("DROP TABLE cart_items;");
    try {
      expect(getCartCountForUser(1)).toBe(0);
    } finally {
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES users(id),
          menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
          quantity INTEGER NOT NULL DEFAULT 1,
          special_instructions TEXT
        );
      `);
    }
  });
});
