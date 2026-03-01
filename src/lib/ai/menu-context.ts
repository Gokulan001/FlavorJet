import { db } from "@/db";
import { categories, menuItems, modifierGroups, modifiers } from "@/db/schema";
import { eq, like, and, gte, lte, desc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";

// ── Badges ───────────────────────────────────────────────────────────────────
const BESTSELLER_SLUGS = new Set([
  "classic-beef-burger", "margherita-pizza", "spaghetti-carbonara",
  "grilled-salmon", "chocolate-lava-cake", "ribeye-steak",
  "classic-caesar-salad", "clam-chowder",
]);
const SPICY_SLUGS = new Set([
  "stuffed-jalapeno-poppers", "penne-arrabiata", "spicy-black-bean-burger",
  "spicy-pumpkin-soup", "fish-tacos",
]);
const NEW_SLUGS = new Set([
  "caprese-bruschetta", "mediterranean-chickpea-salad", "mushroom-risotto",
  "turkey-and-avocado-wrap", "hawaiian-pizza", "crab-cakes",
  "fruit-tart", "grilled-vegetable-platter",
]);

function getBadge(slug: string): string {
  if (BESTSELLER_SLUGS.has(slug)) return "🔥Bestseller";
  if (SPICY_SLUGS.has(slug)) return "🌶️Spicy";
  if (NEW_SLUGS.has(slug)) return "✨New";
  return "";
}

// ── Compact Category List (for system prompt — only ~50 tokens) ─────────────
let cachedCategoryList: string | null = null;
let categoryCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function getCategoryList(): string {
  const now = Date.now();
  if (cachedCategoryList && now - categoryCacheTime < CACHE_TTL) return cachedCategoryList;

  const cats = db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(categories.displayOrder)
    .all();

  cachedCategoryList = cats.map((c) => c.name).join(", ");
  categoryCacheTime = now;
  return cachedCategoryList;
}

// ── Tool Functions (called on-demand by AI — saves tokens) ──────────────────

interface MenuItemResult {
  id: number;
  name: string;
  price: string;
  rating: string;
  description: string;
  category: string;
  categorySlug: string;
  itemSlug: string;
  imageUrl: string;
  badge: string;
  hasModifiers: boolean;
  customizeUrl: string;
}

function formatItem(
  item: { id: number; name: string; slug: string; description: string; price: number; rating: string; isAvailable: number | boolean; imageUrl?: string },
  catName: string,
  catSlug: string
): MenuItemResult {
  const hasMods = db
    .select({ id: modifierGroups.id })
    .from(modifierGroups)
    .where(eq(modifierGroups.menuItemId, item.id))
    .all().length > 0;

  return {
    id: item.id,
    name: item.name,
    price: formatPrice(item.price),
    rating: String(item.rating),
    description: item.description?.slice(0, 100) || "",
    category: catName,
    categorySlug: catSlug,
    itemSlug: item.slug,
    imageUrl: item.imageUrl || "",
    badge: getBadge(item.slug),
    hasModifiers: hasMods,
    customizeUrl: hasMods ? `/menu/${catSlug}/${item.slug}` : "",
  };
}

/** Search menu items by name/description keyword */
export function searchMenu(query: string): MenuItemResult[] {
  const pattern = `%${query.toLowerCase()}%`;

  const results = db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      slug: menuItems.slug,
      description: menuItems.description,
      price: menuItems.price,
      rating: menuItems.rating,
      isAvailable: menuItems.isAvailable,
      imageUrl: menuItems.imageUrl,
      categoryId: menuItems.categoryId,
      catName: categories.name,
      catSlug: categories.slug,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(
      and(
        eq(menuItems.isAvailable, true),
        like(menuItems.name, pattern)
      )
    )
    .limit(8)
    .all();

  // Also search description if name didn't match enough
  if (results.length < 3) {
    const descResults = db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        slug: menuItems.slug,
        description: menuItems.description,
        price: menuItems.price,
        rating: menuItems.rating,
        isAvailable: menuItems.isAvailable,
        imageUrl: menuItems.imageUrl,
        categoryId: menuItems.categoryId,
        catName: categories.name,
        catSlug: categories.slug,
      })
      .from(menuItems)
      .innerJoin(categories, eq(menuItems.categoryId, categories.id))
      .where(
        and(
          eq(menuItems.isAvailable, true),
          like(menuItems.description, pattern)
        )
      )
      .limit(5)
      .all();

    const existingIds = new Set(results.map((r) => r.id));
    for (const r of descResults) {
      if (!existingIds.has(r.id)) results.push(r);
    }
  }

  return results.map((r) => formatItem(r, r.catName, r.catSlug));
}

/** Get all items in a category */
export function getCategoryItems(categoryName: string): MenuItemResult[] {
  const cat = db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .where(like(categories.name, `%${categoryName}%`))
    .get();

  if (!cat) return [];

  const items = db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      slug: menuItems.slug,
      description: menuItems.description,
      price: menuItems.price,
      rating: menuItems.rating,
      isAvailable: menuItems.isAvailable,
      imageUrl: menuItems.imageUrl,
    })
    .from(menuItems)
    .where(and(eq(menuItems.categoryId, cat.id), eq(menuItems.isAvailable, true)))
    .all();

  return items.map((item) => formatItem(item, cat.name, cat.slug));
}

/** Get details for a specific item by ID */
export function getItemDetails(itemId: number): (MenuItemResult & { modifierGroups: { name: string; required: boolean; options: { id: number; name: string; price: string }[] }[] }) | null {
  const item = db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      slug: menuItems.slug,
      description: menuItems.description,
      price: menuItems.price,
      rating: menuItems.rating,
      isAvailable: menuItems.isAvailable,
      categoryId: menuItems.categoryId,
    })
    .from(menuItems)
    .where(eq(menuItems.id, itemId))
    .get();

  if (!item) return null;

  const cat = db
    .select({ name: categories.name, slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, item.categoryId))
    .get();

  if (!cat) return null;

  const groups = db
    .select({
      id: modifierGroups.id,
      name: modifierGroups.name,
      required: modifierGroups.required,
    })
    .from(modifierGroups)
    .where(eq(modifierGroups.menuItemId, item.id))
    .all();

  const modifierGroupsData = groups.map((g) => {
    const opts = db
      .select({
        id: modifiers.id,
        name: modifiers.name,
        priceAdjustment: modifiers.priceAdjustment,
      })
      .from(modifiers)
      .where(eq(modifiers.modifierGroupId, g.id))
      .all();

    return {
      name: g.name,
      required: Boolean(g.required),
      options: opts.map((o) => ({
        id: o.id,
        name: o.name,
        price: o.priceAdjustment > 0 ? `+${formatPrice(o.priceAdjustment)}` : "Free",
      })),
    };
  });

  return {
    ...formatItem(item, cat.name, cat.slug),
    modifierGroups: modifierGroupsData,
  };
}

/** Get popular / bestseller items */
export function getPopularItems(): MenuItemResult[] {
  const items = db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      slug: menuItems.slug,
      description: menuItems.description,
      price: menuItems.price,
      rating: menuItems.rating,
      isAvailable: menuItems.isAvailable,
      imageUrl: menuItems.imageUrl,
      categoryId: menuItems.categoryId,
      catName: categories.name,
      catSlug: categories.slug,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(eq(menuItems.isAvailable, true))
    .orderBy(desc(menuItems.rating))
    .limit(8)
    .all();

  return items.map((r) => formatItem(r, r.catName, r.catSlug));
}
