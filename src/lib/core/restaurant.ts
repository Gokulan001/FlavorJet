// ── Restaurant domain core ───────────────────────────────────────────────────
// Framework-agnostic, uncached reads of restaurant info / dietary guides /
// promotions from Supabase. Mirrors src/lib/supabase/queries/restaurant.ts
// without the next/cache wrapper.

import { supabaseServer } from "@/lib/supabase/server";

export async function getRestaurantInfo(topic: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabaseServer
    .from("restaurant_info")
    .select("key, value")
    .ilike("key", `%${topic}%`);
  if (error || !data || data.length === 0) return null;
  const result: Record<string, unknown> = {};
  for (const row of data) result[row.key] = row.value;
  return result;
}

export interface DietaryGuide {
  name: string;
  description: string;
  recommendedItemIds: number[];
  avoidAllergens: string[];
}

export async function getDietaryGuide(diet: string): Promise<DietaryGuide | null> {
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
}

export interface Promotion {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
  minOrderTotal: number | null;
  validUntil: string | null;
}

export async function getActivePromotions(): Promise<Promotion[]> {
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
}
