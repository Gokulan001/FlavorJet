import { unstable_cache } from "next/cache";
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

// ── Cached Queries ──────────────────────────────────────────────────────────

/** Get menu items by Supabase IDs (for RAG enrichment after Pinecone search) */
export const getMenuItemsByIds = async (ids: number[]): Promise<MenuItemResult[]> => {
  if (ids.length === 0) return [];

  // Sort IDs for stable cache key
  const sorted = [...ids].sort((a, b) => a - b);
  const cacheKey = sorted.join(",");

  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("menu_items")
        .select("*, categories(name, slug)")
        .in("id", sorted)
        .eq("is_available", true);

      if (error || !data) return [];
      return (data as unknown as RawMenuRow[]).map(formatRow);
    },
    ["items-by-ids", cacheKey],
    { revalidate: 300 } // 5 min
  )();
};

/** Get all items in a category by slug */
export const getCategoryItemsFromSupabase = async (categorySlug: string): Promise<MenuItemResult[]> => {
  return unstable_cache(
    async () => {
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
    },
    ["cat-items", categorySlug],
    { revalidate: 600 } // 10 min
  )();
};

/** Get popular items ordered by rating */
export const getPopularItemsFromSupabase = async (limit: number = 8): Promise<MenuItemResult[]> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("menu_items")
        .select("*, categories(name, slug)")
        .eq("is_available", true)
        .order("rating", { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return (data as unknown as RawMenuRow[]).map(formatRow);
    },
    ["popular", String(limit)],
    { revalidate: 600 } // 10 min
  )();
};

/** Get item details by slug from Supabase */
export const getItemBySlug = async (slug: string): Promise<MenuItemResult | null> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("menu_items")
        .select("*, categories(name, slug)")
        .eq("slug", slug)
        .single();

      if (error || !data) return null;
      return formatRow(data as unknown as RawMenuRow);
    },
    ["item-slug", slug],
    { revalidate: 600 } // 10 min
  )();
};

/** Fuzzy name search — for direct orders like "2 tiramisus" */
export const getItemsByName = async (query: string, limit: number = 4): Promise<MenuItemResult[]> => {
  const cleaned = query.replace(/[^a-zA-Z\s]/g, "").trim();
  if (!cleaned) return [];

  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("menu_items")
        .select("*, categories(name, slug)")
        .ilike("name", `%${cleaned}%`)
        .eq("is_available", true)
        .limit(limit);

      if (error || !data) return [];
      return (data as unknown as RawMenuRow[]).map(formatRow);
    },
    ["items-name", cleaned.toLowerCase(), String(limit)],
    { revalidate: 300 } // 5 min
  )();
};

/** Get category list for system prompt */
export const getCategoryList = async (): Promise<string> => {
  return unstable_cache(
    async () => {
      const { data } = await supabaseServer
        .from("categories")
        .select("name")
        .order("display_order");

      if (!data) return "";
      return data.map((c: { name: string }) => c.name).join(", ");
    },
    ["cat-list"],
    { revalidate: 1800 } // 30 min
  )();
};
