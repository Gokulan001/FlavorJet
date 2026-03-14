import { supabaseServer } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";

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
  if (BESTSELLER_SLUGS.has(slug)) return "Bestseller";
  if (SPICY_SLUGS.has(slug)) return "Spicy";
  if (NEW_SLUGS.has(slug)) return "New";
  return "";
}

// ── Row → MenuItemResult ─────────────────────────────────────────────────────

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

// ── Queries ──────────────────────────────────────────────────────────────────

/** Get menu items by Supabase IDs (for RAG enrichment after Pinecone search) */
export async function getMenuItemsByIds(ids: number[]): Promise<MenuItemResult[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .in("id", ids)
    .eq("is_available", true);

  if (error || !data) return [];
  return (data as unknown as RawMenuRow[]).map(formatRow);
}

/** Get all items in a category by slug */
export async function getCategoryItemsFromSupabase(categorySlug: string): Promise<MenuItemResult[]> {
  // First get category ID
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

/** Get popular items ordered by rating */
export async function getPopularItemsFromSupabase(limit: number = 8): Promise<MenuItemResult[]> {
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .eq("is_available", true)
    .order("rating", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as unknown as RawMenuRow[]).map(formatRow);
}

/** Get item details by slug from Supabase */
export async function getItemBySlug(slug: string): Promise<MenuItemResult | null> {
  const { data, error } = await supabaseServer
    .from("menu_items")
    .select("*, categories(name, slug)")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return formatRow(data as unknown as RawMenuRow);
}

/** Fuzzy name search — for direct orders like "2 tiramisus" */
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

/** Get category list for system prompt */
export async function getCategoryList(): Promise<string> {
  const { data } = await supabaseServer
    .from("categories")
    .select("name")
    .order("display_order");

  if (!data) return "";
  return data.map((c: { name: string }) => c.name).join(", ");
}
