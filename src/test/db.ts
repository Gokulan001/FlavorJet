import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    profile_picture TEXT,
    phone TEXT,
    street TEXT,
    apartment TEXT,
    city TEXT,
    zip_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    bg_color TEXT NOT NULL DEFAULT '#f5f5f5',
    display_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    rating TEXT NOT NULL DEFAULT '4.5',
    is_available INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    special_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS modifier_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    name TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 0,
    min_select INTEGER NOT NULL DEFAULT 0,
    max_select INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modifier_group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
    name TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cart_item_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_item_id INTEGER NOT NULL REFERENCES cart_items(id),
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'confirmed',
    total INTEGER NOT NULL,
    delivery_address TEXT,
    delivery_phone TEXT,
    tip INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    special_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
    modifier_name TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL
  );
`;

let sharedSqlite: ReturnType<typeof Database> | null = null;

export function getTestSqlite() {
  if (!sharedSqlite) {
    sharedSqlite = new Database(":memory:");
    sharedSqlite.pragma("foreign_keys = ON");
    sharedSqlite.exec(SCHEMA_SQL);
  }
  return sharedSqlite;
}

export function getTestDb() {
  return drizzle(getTestSqlite(), { schema });
}

export function resetTestDb() {
  const s = getTestSqlite();
  s.exec(
    "DELETE FROM order_item_modifiers; DELETE FROM order_items; DELETE FROM orders; DELETE FROM cart_item_modifiers; DELETE FROM cart_items; DELETE FROM modifiers; DELETE FROM modifier_groups; DELETE FROM menu_items; DELETE FROM categories; DELETE FROM sessions; DELETE FROM users;",
  );
}

export function seedMenuItemWithModifiers(
  categoryId: number,
  itemName: string,
  groups: {
    name: string;
    required?: boolean;
    minSelect?: number;
    maxSelect?: number;
    modifiers: { name: string; priceAdjustment?: number }[];
  }[] = [],
): { itemId: number; groupIds: number[]; modifierIds: number[] } {
  const s = getTestSqlite();
  const slug = itemName.toLowerCase().replace(/\s+/g, "-");

  const itemResult = s
    .prepare(
      "INSERT INTO menu_items (category_id, name, slug, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(categoryId, itemName, slug, `${itemName} desc`, 1000, `/img/${slug}.jpg`);
  const itemId = Number(itemResult.lastInsertRowid);

  const groupIds: number[] = [];
  const modifierIds: number[] = [];
  const insertGroup = s.prepare(
    "INSERT INTO modifier_groups (menu_item_id, name, required, min_select, max_select) VALUES (?, ?, ?, ?, ?)",
  );
  const insertMod = s.prepare(
    "INSERT INTO modifiers (modifier_group_id, name, price_adjustment) VALUES (?, ?, ?)",
  );

  for (const group of groups) {
    const gResult = insertGroup.run(
      itemId,
      group.name,
      group.required ? 1 : 0,
      group.minSelect ?? 0,
      group.maxSelect ?? 1,
    );
    const gid = Number(gResult.lastInsertRowid);
    groupIds.push(gid);
    for (const mod of group.modifiers) {
      const mResult = insertMod.run(gid, mod.name, mod.priceAdjustment ?? 0);
      modifierIds.push(Number(mResult.lastInsertRowid));
    }
  }

  return { itemId, groupIds, modifierIds };
}

export function seedCartItems(
  userId: number,
  items: { menuItemId: number; quantity: number }[],
) {
  const s = getTestSqlite();
  const insert = s.prepare(
    "INSERT INTO cart_items (user_id, menu_item_id, quantity) VALUES (?, ?, ?)",
  );
  for (const item of items) {
    insert.run(userId, item.menuItemId, item.quantity);
  }
}

export function seedHomepageFixtures() {
  const s = getTestSqlite();

  const insertCategory = s.prepare(
    "INSERT INTO categories (name, slug, description, image_url, bg_color, display_order) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const cats = [
    ["Breakfast", "breakfast", "Morning meals", "/img/breakfast.jpg", "#fff4e0", 1],
    ["Lunch", "lunch", "Midday meals", "/img/lunch.jpg", "#e0f4ff", 2],
    ["Dinner", "dinner", "Evening meals", "/img/dinner.jpg", "#ffe0e0", 3],
    ["Dessert", "dessert", "Sweet treats", "/img/dessert.jpg", "#f0e0ff", 4],
    ["Drinks", "drinks", "Refreshments", "/img/drinks.jpg", "#e0ffe0", 5],
  ] as const;
  const categoryIds: number[] = [];
  for (const [name, slug, description, imageUrl, bgColor, order] of cats) {
    const result = insertCategory.run(name, slug, description, imageUrl, bgColor, order);
    categoryIds.push(Number(result.lastInsertRowid));
  }

  const insertItem = s.prepare(
    "INSERT INTO menu_items (category_id, name, slug, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
  );
  // 36 items distributed across the 5 categories so PopularMenuSection's split-into-3 works
  for (let i = 1; i <= 36; i++) {
    const categoryId = categoryIds[(i - 1) % categoryIds.length];
    insertItem.run(
      categoryId,
      `Item ${i}`,
      `item-${i}`,
      `Description for item ${i}`,
      500 + i * 25,
      `/img/item-${i}.jpg`,
    );
  }

  return { categoryIds };
}
