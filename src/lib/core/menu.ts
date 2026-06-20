// ── Menu domain core ─────────────────────────────────────────────────────────
// Framework-agnostic menu reads. UNCACHED on purpose: the web app wraps these
// concerns with next/cache (unstable_cache) in src/lib/supabase/queries/*; the
// MCP server manages its own freshness, so the core stays free of next/* imports.
//
// Two id spaces (same as the existing app): rich menu metadata lives in Supabase;
// cart/order rows reference the LOCAL SQLite `menu_items.id`. Slugs are consistent
// across both, so we browse/search via Supabase and resolve slug → SQLite id for
// cart operations via `getLocalItemBySlug`.

import { supabaseServer } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { db } from "@/db";
import { menuItems, modifierGroups, modifiers, categories } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";

// ── Types ────────────────────────────────────────────────────────────────────
export interface MenuItemResult {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  priceCents: number;
  rating: string;
  imageUrl: string;
  category: string;
  categorySlug: string;
  isSpicy: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  allergens: string[];
  calories: number | null;
  prepTimeMinutes: number | null;
  badge: string;
  isAvailable: boolean;
}

interface RawMenuRow {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  rating: number;
  image_url: string;
  is_available: boolean;
  is_spicy: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  allergens: string[] | null;
  calories: number | null;
  prep_time_minutes: number | null;
  categories: { name: string; slug: string } | null;
}

// ── Badges (mirrors src/lib/supabase/queries/menu.ts) ─────────────────────────
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
  if (BESTSELLER_SLUGS.has(slug)) return "Bestseller";
  if (SPICY_SLUGS.has(slug)) return "Spicy";
  if (NEW_SLUGS.has(slug)) return "New";
  return "";
}

function formatRow(row: RawMenuRow): MenuItemResult {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description?.slice(0, 150) || "",
    price: formatPrice(row.price),
    priceCents: row.price,
    rating: String(row.rating),
    imageUrl: row.image_url || "",
    category: row.categories?.name || "",
    categorySlug: row.categories?.slug || "",
    isSpicy: row.is_spicy ?? false,
    isVegetarian: row.is_vegetarian ?? false,
    isVegan: row.is_vegan ?? false,
    isGlutenFree: row.is_gluten_free ?? false,
    allergens: row.allergens || [],
    calories: row.calories,
    prepTimeMinutes: row.prep_time_minutes,
    badge: getBadge(row.slug),
    isAvailable: row.is_available,
  };
}

// ── Supabase reads (uncached) ─────────────────────────────────────────────────
export async function getItemsByName(query: string, limit: number = 4): Promise<MenuItemResult[]> {
  const cleaned = query.replace(/[^a-zA-Z\s]/g, "").trim();
  if (!cleaned) return [];
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .ilike("name", `%${cleaned}%`)
    .eq("is_available", true)
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as RawMenuRow[]).map(formatRow);
}

export async function getCategoryItems(categorySlug: string): Promise<MenuItemResult[]> {
  const { data: cat } = await supabaseServer
    .from("categories")
    .select("id, name, slug")
    .eq("slug", categorySlug)
    .single();
  if (!cat) return [];
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .eq("category_id", cat.id)
    .eq("is_available", true)
    .order("name");
  if (error || !data) return [];
  return (data as unknown as RawMenuRow[]).map(formatRow);
}

export async function getPopularItems(limit: number = 8): Promise<MenuItemResult[]> {
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .eq("is_available", true)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as unknown as RawMenuRow[]).map(formatRow);
}

export async function getItemBySlug(slug: string): Promise<MenuItemResult | null> {
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return formatRow(data as unknown as RawMenuRow);
}

export interface CategorySummary {
  name: string;
  slug: string;
  description: string;
}

export async function getAllCategories(): Promise<CategorySummary[]> {
  const { data, error } = await supabaseServer
    .from("categories")
    .select("name, slug, description")
    .order("display_order");
  if (error || !data) return [];
  return data as CategorySummary[];
}

// ── Local SQLite reads (cart resolution + modifiers) ──────────────────────────

/** Name search against LOCAL SQLite (reliable, offline). Returns formatted price. */
export function findItemsByName(query: string, limit = 6): { name: string; slug: string; price: string }[] {
  const cleaned = query.trim();
  if (!cleaned) return [];
  const rows = db
    .select({ name: menuItems.name, slug: menuItems.slug, price: menuItems.price })
    .from(menuItems)
    .where(and(like(menuItems.name, `%${cleaned}%`), eq(menuItems.isAvailable, true)))
    .limit(limit)
    .all();
  return rows.map((r) => ({ name: r.name, slug: r.slug, price: formatPrice(r.price) }));
}

/** All categories from LOCAL SQLite, in display order. */
export function getCategoriesLocal(): { name: string; slug: string; description: string }[] {
  return db
    .select({ name: categories.name, slug: categories.slug, description: categories.description })
    .from(categories)
    .orderBy(categories.displayOrder)
    .all();
}

/** Items in a category (by slug) from LOCAL SQLite. */
export function getCategoryItemsLocal(categorySlug: string): { name: string; slug: string; price: string }[] {
  const cat = db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).get();
  if (!cat) return [];
  const rows = db
    .select({ name: menuItems.name, slug: menuItems.slug, price: menuItems.price })
    .from(menuItems)
    .where(and(eq(menuItems.categoryId, cat.id), eq(menuItems.isAvailable, true)))
    .orderBy(menuItems.name)
    .all();
  return rows.map((r) => ({ name: r.name, slug: r.slug, price: formatPrice(r.price) }));
}

/** Single item detail from LOCAL SQLite (fuzzy slug). null if not found. */
export function getItemLocal(slug: string): { name: string; slug: string; price: string; description: string; rating: string } | null {
  const found = getLocalItemBySlug(slug);
  if (!found) return null;
  const row = db
    .select({ name: menuItems.name, slug: menuItems.slug, price: menuItems.price, description: menuItems.description, rating: menuItems.rating })
    .from(menuItems)
    .where(eq(menuItems.id, found.id))
    .get();
  if (!row) return null;
  return { name: row.name, slug: row.slug, price: formatPrice(row.price), description: row.description, rating: row.rating };
}

/** Resolve a slug to the LOCAL SQLite menu item (used for cart/order ops). Fuzzy. */
export function getLocalItemBySlug(slug: string): { id: number; name: string; slug: string } | null {
  const get = (s: string) =>
    db.select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug })
      .from(menuItems).where(eq(menuItems.slug, s)).get();

  const exact = get(slug);
  if (exact) return exact;

  const normalized = slug.toLowerCase().replace(/\s+/g, "-");
  const exactNorm = get(normalized);
  if (exactNorm) return exactNorm;

  // Partial match — only if unambiguous
  const all = db.select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug }).from(menuItems).all();
  const matches = all.filter((item) => item.slug.includes(normalized) || normalized.includes(item.slug));
  return matches.length === 1 ? matches[0] : null;
}

export interface ModifierOption {
  id: number;
  name: string;
  priceAdjustment: number; // cents
}
export interface ModifierGroupResult {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}
export interface ItemModifiers {
  itemName: string;
  slug: string;
  basePriceCents: number;
  groups: ModifierGroupResult[];
}

/** Full modifier groups + options for an item (from local SQLite). null if not found. */
export function getModifiersForItem(slug: string): ItemModifiers | null {
  const item = getLocalItemBySlug(slug);
  if (!item) return null;

  const full = db.select({ id: menuItems.id, name: menuItems.name, price: menuItems.price, slug: menuItems.slug })
    .from(menuItems).where(eq(menuItems.id, item.id)).get();
  if (!full) return null;

  const groups = db.select({
    id: modifierGroups.id,
    name: modifierGroups.name,
    required: modifierGroups.required,
    minSelect: modifierGroups.minSelect,
    maxSelect: modifierGroups.maxSelect,
  }).from(modifierGroups).where(eq(modifierGroups.menuItemId, full.id)).all();

  return {
    itemName: full.name,
    slug: full.slug,
    basePriceCents: full.price,
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      required: Boolean(g.required),
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      options: db.select({ id: modifiers.id, name: modifiers.name, priceAdjustment: modifiers.priceAdjustment })
        .from(modifiers).where(eq(modifiers.modifierGroupId, g.id)).all(),
    })),
  };
}

/** Required modifier groups for an item (for elicitation gating). */
export function getRequiredGroups(slug: string): ModifierGroupResult[] {
  const mods = getModifiersForItem(slug);
  if (!mods) return [];
  return mods.groups.filter((g) => g.required);
}
