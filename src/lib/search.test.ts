import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { searchMenuItems, getAllCategories, getPriceRange, getItemBadge } =
  await import("./search");
const { resetTestDb, getTestSqlite } = await import("@/test/db");

function seedCategories() {
  const s = getTestSqlite();
  const insert = s.prepare(
    "INSERT INTO categories (name, slug, description, image_url, bg_color, display_order) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const a = Number(
    insert.run("Apps", "apps", "Appetizers", "/a.jpg", "#fff", 1).lastInsertRowid,
  );
  const b = Number(
    insert.run("Mains", "mains", "Main dishes", "/b.jpg", "#fff", 2).lastInsertRowid,
  );
  return { apps: a, mains: b };
}

function seedItem(
  categoryId: number,
  opts: {
    name: string;
    slug: string;
    price?: number;
    rating?: string;
    available?: boolean;
    description?: string;
  },
): number {
  const s = getTestSqlite();
  const result = s
    .prepare(
      "INSERT INTO menu_items (category_id, name, slug, description, price, image_url, rating, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      categoryId,
      opts.name,
      opts.slug,
      opts.description ?? `${opts.name} desc`,
      opts.price ?? 1000,
      `/img/${opts.slug}.jpg`,
      opts.rating ?? "4.5",
      opts.available === false ? 0 : 1,
    );
  return Number(result.lastInsertRowid);
}

beforeEach(() => {
  resetTestDb();
});

describe("getItemBadge", () => {
  it("returns Bestseller badge for known slugs", () => {
    expect(getItemBadge("classic-beef-burger")?.type).toBe("bestseller");
  });
  it("returns Spicy badge for known slugs", () => {
    expect(getItemBadge("penne-arrabiata")?.type).toBe("spicy");
  });
  it("returns New badge for known slugs", () => {
    expect(getItemBadge("hawaiian-pizza")?.type).toBe("new");
  });
  it("returns null for unknown slugs", () => {
    expect(getItemBadge("totally-made-up-dish")).toBeNull();
  });
});

describe("searchMenuItems", () => {
  it("returns all available items with empty params", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Cheese Fries", slug: "cheese-fries" });
    seedItem(apps, { name: "Onion Rings", slug: "onion-rings" });
    const { items, total } = searchMenuItems({});
    expect(total).toBe(2);
    expect(items.map((i) => i.slug).sort()).toEqual(["cheese-fries", "onion-rings"]);
  });

  it("excludes unavailable items by default", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Available", slug: "available", available: true });
    seedItem(apps, { name: "Soldout", slug: "soldout", available: false });
    const { items } = searchMenuItems({});
    expect(items.map((i) => i.slug)).toEqual(["available"]);
  });

  it("filters by case-insensitive query against name and description", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Spicy Wings", slug: "spicy-wings" });
    seedItem(apps, { name: "Plain Salad", slug: "plain-salad", description: "very SPICY" });
    seedItem(apps, { name: "Bread", slug: "bread" });
    const { items } = searchMenuItems({ query: "spicy" });
    expect(items.map((i) => i.slug).sort()).toEqual(["plain-salad", "spicy-wings"]);
  });

  it("filters by single category slug", () => {
    const { apps, mains } = seedCategories();
    seedItem(apps, { name: "App1", slug: "app1" });
    seedItem(mains, { name: "Main1", slug: "main1" });
    const { items } = searchMenuItems({ categorySlugs: ["apps"] });
    expect(items.map((i) => i.slug)).toEqual(["app1"]);
  });

  it("filters by multiple category slugs", () => {
    const { apps, mains } = seedCategories();
    seedItem(apps, { name: "App1", slug: "app1" });
    seedItem(mains, { name: "Main1", slug: "main1" });
    const { items } = searchMenuItems({ categorySlugs: ["apps", "mains"] });
    expect(items.length).toBe(2);
  });

  it("returns empty when categorySlug doesn't exist", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "X", slug: "x" });
    const { items, total } = searchMenuItems({ categorySlugs: ["nonexistent"] });
    expect(total).toBe(0);
    expect(items).toEqual([]);
  });

  it("applies minPrice and maxPrice filters", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Cheap", slug: "cheap", price: 500 });
    seedItem(apps, { name: "Mid", slug: "mid", price: 1500 });
    seedItem(apps, { name: "Expensive", slug: "expensive", price: 3000 });
    const { items } = searchMenuItems({ minPrice: 1000, maxPrice: 2000 });
    expect(items.map((i) => i.slug)).toEqual(["mid"]);
  });

  it("applies minRating filter", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Low", slug: "low", rating: "3.5" });
    seedItem(apps, { name: "High", slug: "high", rating: "4.8" });
    const { items } = searchMenuItems({ minRating: 4.5 });
    expect(items.map((i) => i.slug)).toEqual(["high"]);
  });

  it("filters by tag (only badged items match)", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Burger", slug: "classic-beef-burger" }); // bestseller
    seedItem(apps, { name: "Random", slug: "random-no-badge" });
    const { items } = searchMenuItems({ tags: ["bestseller"] });
    expect(items.map((i) => i.slug)).toEqual(["classic-beef-burger"]);
  });

  it("sorts by rating desc by default", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "A", slug: "a", rating: "4.0" });
    seedItem(apps, { name: "B", slug: "b", rating: "4.9" });
    seedItem(apps, { name: "C", slug: "c", rating: "4.5" });
    const { items } = searchMenuItems({});
    expect(items.map((i) => i.slug)).toEqual(["b", "c", "a"]);
  });

  it("sorts by price asc when requested", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "A", slug: "a", price: 3000 });
    seedItem(apps, { name: "B", slug: "b", price: 1000 });
    seedItem(apps, { name: "C", slug: "c", price: 2000 });
    const { items } = searchMenuItems({ sort: "price_asc" });
    expect(items.map((i) => i.slug)).toEqual(["b", "c", "a"]);
  });

  it("sorts by name asc when requested", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "Zebra", slug: "zebra" });
    seedItem(apps, { name: "Apple", slug: "apple" });
    const { items } = searchMenuItems({ sort: "name_asc" });
    expect(items.map((i) => i.slug)).toEqual(["apple", "zebra"]);
  });

  it("enriches results with hasModifiers and badge", () => {
    const { apps } = seedCategories();
    const itemId = seedItem(apps, { name: "Burger", slug: "classic-beef-burger" });
    // Add a modifier group for this item
    getTestSqlite()
      .prepare(
        "INSERT INTO modifier_groups (menu_item_id, name, required, min_select, max_select) VALUES (?, ?, 0, 0, 1)",
      )
      .run(itemId, "Toppings");
    const { items } = searchMenuItems({});
    expect(items[0].hasModifiers).toBe(true);
    expect(items[0].badge?.type).toBe("bestseller");
  });
});

describe("getAllCategories", () => {
  it("returns categories ordered by displayOrder asc", () => {
    const s = getTestSqlite();
    const insert = s.prepare(
      "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
    );
    insert.run("C", "c", "d", "/c.jpg", 3);
    insert.run("A", "a", "d", "/a.jpg", 1);
    insert.run("B", "b", "d", "/b.jpg", 2);
    const cats = getAllCategories();
    expect(cats.map((c) => c.slug)).toEqual(["a", "b", "c"]);
  });
});

describe("getPriceRange", () => {
  it("returns min/max prices across menu_items", () => {
    const { apps } = seedCategories();
    seedItem(apps, { name: "A", slug: "a", price: 500 });
    seedItem(apps, { name: "B", slug: "b", price: 3000 });
    seedItem(apps, { name: "C", slug: "c", price: 1500 });
    const range = getPriceRange();
    expect(range.min).toBe(500);
    expect(range.max).toBe(3000);
  });

  it("returns 0/10000 fallback when table is empty", () => {
    seedCategories(); // categories only, no items
    const range = getPriceRange();
    expect(range.min ?? 0).toBe(0);
    expect(range.max ?? 10000).toBe(10000);
  });
});
