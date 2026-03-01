import { db } from "@/db";
import { menuItems, categories, modifierGroups } from "@/db/schema";
import { eq, and, gte, lte, like, or, asc, desc, inArray, sql } from "drizzle-orm";
import { TrendingUp, Flame, Sparkles } from "lucide-react";

// ========================
// BADGE DATA (shared across app)
// ========================

const SPICY_ITEMS = new Set([
  "stuffed-jalapeno-poppers",
  "penne-arrabiata",
  "spicy-black-bean-burger",
  "spicy-pumpkin-soup",
  "fish-tacos",
]);

const BESTSELLER_ITEMS = new Set([
  "classic-beef-burger",
  "margherita-pizza",
  "spaghetti-carbonara",
  "grilled-salmon",
  "chocolate-lava-cake",
  "ribeye-steak",
  "classic-caesar-salad",
  "clam-chowder",
]);

const NEW_ITEMS = new Set([
  "caprese-bruschetta",
  "mediterranean-chickpea-salad",
  "mushroom-risotto",
  "turkey-and-avocado-wrap",
  "hawaiian-pizza",
  "crab-cakes",
  "fruit-tart",
  "grilled-vegetable-platter",
]);

export type BadgeType = "bestseller" | "spicy" | "new";

export interface ItemBadge {
  label: string;
  color: string;
  type: BadgeType;
  icon: typeof TrendingUp;
}

export function getItemBadge(slug: string): ItemBadge | null {
  if (BESTSELLER_ITEMS.has(slug)) {
    return { label: "Bestseller", color: "bg-[#fea116] text-[#0f172b]", type: "bestseller", icon: TrendingUp };
  }
  if (SPICY_ITEMS.has(slug)) {
    return { label: "Spicy", color: "bg-red-500 text-white", type: "spicy", icon: Flame };
  }
  if (NEW_ITEMS.has(slug)) {
    return { label: "New", color: "bg-emerald-500 text-white", type: "new", icon: Sparkles };
  }
  return null;
}

// ========================
// SEARCH TYPES
// ========================

export interface SearchParams {
  query?: string;
  categorySlugs?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  tags?: BadgeType[];
  sort?: "price_asc" | "price_desc" | "rating" | "name_asc";
}

export interface SearchResult {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  rating: string;
  isAvailable: boolean;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  hasModifiers: boolean;
  badge: ItemBadge | null;
}

// ========================
// SEARCH FUNCTION
// ========================

export function searchMenuItems(params: SearchParams): {
  items: SearchResult[];
  total: number;
} {
  const conditions = [];

  conditions.push(eq(menuItems.isAvailable, true));

  if (params.query && params.query.trim()) {
    const searchTerm = `%${params.query.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${menuItems.name})`, searchTerm),
        like(sql`lower(${menuItems.description})`, searchTerm)
      )!
    );
  }

  if (params.categorySlugs && params.categorySlugs.length > 0) {
    const matchedCategories = db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.slug, params.categorySlugs))
      .all();
    const categoryIds = matchedCategories.map((c) => c.id);
    if (categoryIds.length > 0) {
      conditions.push(inArray(menuItems.categoryId, categoryIds));
    } else {
      return { items: [], total: 0 };
    }
  }

  if (params.minPrice !== undefined) {
    conditions.push(gte(menuItems.price, params.minPrice));
  }
  if (params.maxPrice !== undefined) {
    conditions.push(lte(menuItems.price, params.maxPrice));
  }

  if (params.minRating !== undefined) {
    conditions.push(
      gte(sql`CAST(${menuItems.rating} AS REAL)`, params.minRating)
    );
  }

  let orderBy;
  switch (params.sort) {
    case "price_asc":
      orderBy = asc(menuItems.price);
      break;
    case "price_desc":
      orderBy = desc(menuItems.price);
      break;
    case "name_asc":
      orderBy = asc(menuItems.name);
      break;
    case "rating":
    default:
      orderBy = desc(sql`CAST(${menuItems.rating} AS REAL)`);
      break;
  }

  const rows = db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      slug: menuItems.slug,
      description: menuItems.description,
      price: menuItems.price,
      imageUrl: menuItems.imageUrl,
      rating: menuItems.rating,
      isAvailable: menuItems.isAvailable,
      categoryId: menuItems.categoryId,
      categorySlug: categories.slug,
      categoryName: categories.name,
    })
    .from(menuItems)
    .innerJoin(categories, eq(menuItems.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .all();

  let results: SearchResult[] = rows.map((row) => {
    const groups = db
      .select({ id: modifierGroups.id })
      .from(modifierGroups)
      .where(eq(modifierGroups.menuItemId, row.id))
      .all();

    return {
      ...row,
      hasModifiers: groups.length > 0,
      badge: getItemBadge(row.slug),
    };
  });

  if (params.tags && params.tags.length > 0) {
    const tagSet = new Set(params.tags);
    results = results.filter((item) => {
      if (!item.badge) return false;
      return tagSet.has(item.badge.type);
    });
  }

  return { items: results, total: results.length };
}

// ========================
// HELPER QUERIES
// ========================

export function getAllCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(asc(categories.displayOrder))
    .all();
}

export function getPriceRange(): { min: number; max: number } {
  const result = db
    .select({
      min: sql<number>`MIN(${menuItems.price})`,
      max: sql<number>`MAX(${menuItems.price})`,
    })
    .from(menuItems)
    .get();

  return { min: result?.min ?? 0, max: result?.max ?? 10000 };
}
