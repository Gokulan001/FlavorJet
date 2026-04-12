import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

// ── Restaurant Info ──────────────────────────────────────────────────────────

/** Get restaurant info by topic key (hours, location, delivery, about, contact) */
export const getRestaurantInfo = async (topic: string): Promise<Record<string, unknown> | null> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("restaurant_info")
        .select("key, value")
        .ilike("key", `%${topic}%`);

      if (error || !data || data.length === 0) return null;

      const result: Record<string, unknown> = {};
      for (const row of data) {
        result[row.key] = row.value;
      }
      return result;
    },
    ["rest-info", topic.toLowerCase()],
    { revalidate: 1800 } // 30 min
  )();
};

// ── Dietary Guides ───────────────────────────────────────────────────────────

export interface DietaryGuide {
  name: string;
  description: string;
  recommendedItemIds: number[];
  avoidAllergens: string[];
}

/** Get dietary guide by diet name (keto, vegan, vegetarian, gluten-free, etc.) */
export const getDietaryGuide = async (diet: string): Promise<DietaryGuide | null> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("dietary_guides")
        .select("*")
        .ilike("name", `%${diet}%`)
        .single();

      if (error || !data) return null;

      return {
        name: data.name,
        description: data.description,
        recommendedItemIds: data.recommended_item_ids || [],
        avoidAllergens: data.avoid_allergens || [],
      };
    },
    ["diet-guide", diet.toLowerCase()],
    { revalidate: 1800 } // 30 min
  )();
};

// ── Promotions ───────────────────────────────────────────────────────────────

export interface Promotion {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderTotal: number | null;
  validUntil: string | null;
}

/** Get all active promotions */
export const getActivePromotions = async (): Promise<Promotion[]> => {
  return unstable_cache(
    async () => {
      const { data, error } = await supabaseServer
        .from("promotions")
        .select("*")
        .eq("is_active", true);

      if (error || !data) return [];

      return data.map((p) => ({
        code: p.code,
        description: p.description,
        discountType: p.discount_type,
        discountValue: p.discount_value,
        minOrderTotal: p.min_order_total,
        validUntil: p.valid_until,
      }));
    },
    ["promos"],
    { revalidate: 900 } // 15 min
  )();
};
