import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { getRecommendations } = await import("./recommendations");
const { resetTestDb, getTestSqlite } = await import("@/test/db");

function seedPairingCategories() {
  // Seed categories with slugs that match CATEGORY_PAIRINGS keys.
  const s = getTestSqlite();
  const insert = s.prepare(
    "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
  );
  const ids: Record<string, number> = {};
  const slugs = [
    "appetizers",
    "burgers",
    "salads",
    "pasta-and-noodles",
    "desserts",
    "pizza",
  ];
  slugs.forEach((slug, i) => {
    const result = insert.run(slug, slug, `${slug} desc`, `/img/${slug}.jpg`, i);
    ids[slug] = Number(result.lastInsertRowid);
  });
  return ids;
}

function seedItem(
  categoryId: number,
  opts: { name: string; slug: string; rating?: string; available?: boolean },
): number {
  const s = getTestSqlite();
  return Number(
    s
      .prepare(
        "INSERT INTO menu_items (category_id, name, slug, description, price, image_url, rating, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        categoryId,
        opts.name,
        opts.slug,
        `${opts.name} desc`,
        1000,
        `/img/${opts.slug}.jpg`,
        opts.rating ?? "4.5",
        opts.available === false ? 0 : 1,
      ).lastInsertRowid,
  );
}

beforeEach(() => {
  resetTestDb();
});

describe("getRecommendations", () => {
  it("returns [] when cartCategoryIds is empty", () => {
    expect(getRecommendations([], [])).toEqual([]);
  });

  it("returns [] when no complementary categories exist for cart contents", () => {
    // Seed only a category that has no pairings defined
    const s = getTestSqlite();
    const r = s
      .prepare(
        "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
      )
      .run("Mystery", "mystery-cat", "no pairings", "/img/m.jpg", 1);
    expect(getRecommendations([Number(r.lastInsertRowid)], [])).toEqual([]);
  });

  it("returns items from paired categories when cart has burgers (pairs: appetizers, desserts, soups)", () => {
    const ids = seedPairingCategories();
    seedItem(ids["burgers"], { name: "B Burger", slug: "b-burger" });
    seedItem(ids["appetizers"], { name: "Wings", slug: "wings" });
    seedItem(ids["desserts"], { name: "Cake", slug: "cake" });
    seedItem(ids["salads"], { name: "Caesar", slug: "caesar" }); // not paired with burgers

    const recs = getRecommendations([ids["burgers"]], []);
    const slugs = recs.map((r) => r.slug).sort();
    expect(slugs).toContain("wings");
    expect(slugs).toContain("cake");
    expect(slugs).not.toContain("caesar");
  });

  it("excludes items already in the cart", () => {
    const ids = seedPairingCategories();
    seedItem(ids["burgers"], { name: "Burger", slug: "burger" });
    const wingsId = seedItem(ids["appetizers"], { name: "Wings", slug: "wings" });
    const fritsId = seedItem(ids["appetizers"], { name: "Fries", slug: "fries" });

    const recs = getRecommendations([ids["burgers"]], [wingsId]);
    expect(recs.map((r) => r.id)).toContain(fritsId);
    expect(recs.map((r) => r.id)).not.toContain(wingsId);
  });

  it("caps results at 6", () => {
    const ids = seedPairingCategories();
    // Seed many appetizers (paired with burgers)
    for (let i = 1; i <= 10; i++) {
      seedItem(ids["appetizers"], { name: `App ${i}`, slug: `app-${i}` });
    }
    const recs = getRecommendations([ids["burgers"]], []);
    expect(recs.length).toBeLessThanOrEqual(6);
  });

  it("excludes unavailable items", () => {
    const ids = seedPairingCategories();
    seedItem(ids["appetizers"], { name: "Available", slug: "avail" });
    seedItem(ids["appetizers"], { name: "Soldout", slug: "soldout", available: false });
    const recs = getRecommendations([ids["burgers"]], []);
    const slugs = recs.map((r) => r.slug);
    expect(slugs).toContain("avail");
    expect(slugs).not.toContain("soldout");
  });

  it("sets hasModifiers=true when the item has at least one modifier group", () => {
    const ids = seedPairingCategories();
    const wingsId = seedItem(ids["appetizers"], { name: "Wings", slug: "wings" });
    getTestSqlite()
      .prepare(
        "INSERT INTO modifier_groups (menu_item_id, name, required, min_select, max_select) VALUES (?, 'Sauce', 0, 0, 1)",
      )
      .run(wingsId);

    const recs = getRecommendations([ids["burgers"]], []);
    const wings = recs.find((r) => r.slug === "wings");
    expect(wings?.hasModifiers).toBe(true);
  });

  it("includes the paired categorySlug and categoryName in each result", () => {
    const ids = seedPairingCategories();
    seedItem(ids["appetizers"], { name: "Wings", slug: "wings" });
    const recs = getRecommendations([ids["burgers"]], []);
    const wings = recs.find((r) => r.slug === "wings");
    expect(wings?.categorySlug).toBe("appetizers");
    expect(wings?.categoryName).toBe("appetizers"); // seed uses slug as name
  });
});
