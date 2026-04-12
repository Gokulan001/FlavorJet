import { tool } from "ai";
import { z } from "zod";
import { semanticSearch } from "./search";
import {
  getCategoryItemsFromSupabase,
  getPopularItemsFromSupabase,
  getItemBySlug,
  getItemsByName,
} from "@/lib/supabase/queries/menu";
import type { MenuItemResult } from "@/lib/supabase/queries/menu";
import {
  getRestaurantInfo,
  getDietaryGuide,
  getActivePromotions,
} from "@/lib/supabase/queries/restaurant";
import { formatPrice } from "@/lib/utils";
import { db } from "@/db";
import { menuItems, modifierGroups, modifiers, orderItems } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { addToCart, removeFromCartBySlug, getOrders } from "@/actions/cart-actions";
import type { PriceFilter } from "./search";

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSqliteItemBySlug(slug: string) {
  return db
    .select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug })
    .from(menuItems)
    .where(eq(menuItems.slug, slug))
    .get();
}

// Fuzzy fallback: if exact slug fails, try partial match (e.g. "salad" → "greek-salad")
function getSqliteItemBySlugFuzzy(slug: string) {
  const exact = getSqliteItemBySlug(slug);
  if (exact) return exact;

  const normalized = slug.toLowerCase().replace(/\s+/g, "-");
  const exactNorm = getSqliteItemBySlug(normalized);
  if (exactNorm) return exactNorm;

  // Partial match — only return if exactly one item matches (avoid ambiguity)
  const all = db
    .select({ id: menuItems.id, name: menuItems.name, slug: menuItems.slug })
    .from(menuItems)
    .all();
  const matches = all.filter(
    (item) => item.slug.includes(normalized) || normalized.includes(item.slug)
  );
  return matches.length === 1 ? matches[0] : null;
}

function getItemDisplayExtras(slug: string): { hasModifiers: boolean } {
  const sqliteItem = getSqliteItemBySlug(slug);
  if (!sqliteItem) return { hasModifiers: false };
  const mods = db
    .select({ id: modifierGroups.id })
    .from(modifierGroups)
    .where(eq(modifierGroups.menuItemId, sqliteItem.id))
    .all();
  return { hasModifiers: mods.length > 0 };
}

function toMinimalItem(item: MenuItemResult, extras: { hasModifiers: boolean }) {
  // id + imageUrl excluded: LLM uses slug not IDs; images fetched client-side via /api/menu/images
  return {
    name: item.name,
    price: item.price,
    slug: item.slug,
    rating: item.rating,
    hasModifiers: extras.hasModifiers,
    vegan: item.isVegan,
    vegetarian: item.isVegetarian,
    glutenFree: item.isGlutenFree,
  };
}

// ── Tool Definitions (8 tools) ──────────────────────────────────────────────

export function createRAGTools() {
  return {
    // 1. Semantic menu search (Pinecone + Supabase)
    search_menu: tool({
      description: "Search menu by natural language query with optional dietary filters.",
      inputSchema: z.object({
        query: z.string().describe("Food search query"),
        limit: z.number().optional().default(4),
        max_price: z.number().optional(),
        min_price: z.number().optional(),
        vegan: z.boolean().optional().describe("Only vegan items"),
        vegetarian: z.boolean().optional().describe("Only vegetarian items"),
        glutenFree: z.boolean().optional().describe("Only gluten-free items"),
      }),
      execute: async ({ query, limit, max_price, min_price, vegan, vegetarian, glutenFree }) => {
        console.log(`[search_menu] "${query}" limit:${limit} maxPrice:${max_price} vegan:${vegan} vegetarian:${vegetarian} glutenFree:${glutenFree}`);
        const priceFilter: PriceFilter | undefined =
          max_price !== undefined || min_price !== undefined
            ? { maxDollars: max_price, minDollars: min_price }
            : undefined;
        let results = await semanticSearch(query, limit * 2, priceFilter); // Fetch extra to account for filtering

        // Apply dietary filters
        if (vegan) {
          results = results.filter((r) => r.isVegan === true);
        } else if (vegetarian) {
          results = results.filter((r) => r.isVegetarian === true);
        }
        if (glutenFree) {
          results = results.filter((r) => r.isGlutenFree === true);
        }

        // Trim to requested limit after filtering
        results = results.slice(0, limit);

        if (results.length === 0) return { found: false, message: "No items match that search." };
        const items = results.map((r) => toMinimalItem(r, getItemDisplayExtras(r.slug)));
        return { found: true, items };
      },
    }),

    // 2. Fuzzy name search (Supabase, no Pinecone)
    get_items_by_name: tool({
      description: "Find menu items by exact or partial name.",
      inputSchema: z.object({
        name: z.string().describe("Item name or partial name"),
      }),
      execute: async ({ name }) => {
        console.log(`[get_items_by_name] "${name}"`);
        const results = await getItemsByName(name);
        if (results.length === 0) return { found: false, message: `No items matching "${name}".` };
        const items = results.map((r) => toMinimalItem(r, getItemDisplayExtras(r.slug)));
        return { found: true, items };
      },
    }),

    // 3. Category items (Supabase)
    get_category_items: tool({
      description: "List all items in a menu category. Use exact slugs: burgers, pizza, pasta-and-noodles, salads, soups, appetizers, desserts, seafood, steaks-and-grills.",
      inputSchema: z.object({
        categorySlug: z.string().describe("Exact category slug: burgers | pizza | pasta-and-noodles | salads | soups | appetizers | desserts | seafood | steaks-and-grills"),
      }),
      execute: async ({ categorySlug }) => {
        // Normalize slug — Gemini sometimes uses singular/wrong forms
        const SLUG_MAP: Record<string, string> = {
          "salad": "salads",
          "pasta": "pasta-and-noodles",
          "noodle": "pasta-and-noodles",
          "noodles": "pasta-and-noodles",
          "steak": "steaks-and-grills",
          "steaks": "steaks-and-grills",
          "grill": "steaks-and-grills",
          "grills": "steaks-and-grills",
          "steak-and-grill": "steaks-and-grills",
          "appetizer": "appetizers",
          "starter": "appetizers",
          "starters": "appetizers",
          "soup": "soups",
          "dessert": "desserts",
          "burger": "burgers",
          "sea-food": "seafood",
          "sandwich": "appetizers", // fallback — no sandwich category
          "sandwiches": "appetizers",
        };
        const normalized = SLUG_MAP[categorySlug.toLowerCase()] ?? categorySlug.toLowerCase();
        console.log(`[get_category_items] "${categorySlug}" → normalized: "${normalized}"`);

        let rawItems = await getCategoryItemsFromSupabase(normalized);

        // Fallback: try original if normalization returned nothing
        if (rawItems.length === 0 && normalized !== categorySlug) {
          rawItems = await getCategoryItemsFromSupabase(categorySlug);
        }

        if (rawItems.length === 0) return { found: false, message: `No items in "${normalized}". Available: burgers, pizza, pasta-and-noodles, salads, soups, appetizers, desserts, seafood, steaks-and-grills` };
        const items = rawItems.map((r) => toMinimalItem(r, getItemDisplayExtras(r.slug)));
        return { found: true, category: normalized, items };
      },
    }),

    // 4. Popular items (Supabase)
    get_popular_items: tool({
      description: "Get top-rated popular menu items.",
      inputSchema: z.object({
        limit: z.number().optional().default(6),
      }),
      execute: async ({ limit }) => {
        console.log(`[get_popular_items] limit:${limit}`);
        const rawItems = await getPopularItemsFromSupabase(limit);
        const items = rawItems.map((r) => toMinimalItem(r, getItemDisplayExtras(r.slug)));
        return { items };
      },
    }),

    // 5. Modifiers — minimal (SQLite)
    get_modifiers: tool({
      description: "Get customization options for an item.",
      inputSchema: z.object({
        itemSlug: z.string(),
      }),
      execute: async ({ itemSlug }) => {
        console.log(`[get_modifiers] "${itemSlug}"`);
        const sqliteItem = getSqliteItemBySlugFuzzy(itemSlug);
        if (!sqliteItem) return { hasModifiers: false, message: "Item not found." };

        const groups = db
          .select({
            id: modifierGroups.id,
            name: modifierGroups.name,
            required: modifierGroups.required,
          })
          .from(modifierGroups)
          .where(eq(modifierGroups.menuItemId, sqliteItem.id))
          .all();

        if (groups.length === 0) return { hasModifiers: false, message: "No customization options." };

        const itemInfo = await getItemBySlug(itemSlug);

        const minimalGroups = groups.map((g) => {
          const optCount = db
            .select({ id: modifiers.id })
            .from(modifiers)
            .where(eq(modifiers.modifierGroupId, g.id))
            .all().length;

          return {
            id: g.id,
            name: g.name,
            required: Boolean(g.required),
            maxSelections: optCount,
          };
        });

        return {
          hasModifiers: true,
          itemName: itemInfo?.name || sqliteItem.name,
          basePrice: itemInfo?.price || "",
          groups: minimalGroups,
        };
      },
    }),

    // 6. Add to cart (SQLite)
    add_to_cart: tool({
      description: "Add items to cart by slug and quantity.",
      inputSchema: z.object({
        items: z.array(
          z.object({
            slug: z.string(),
            quantity: z.number().min(1).default(1),
            modifierIds: z.array(z.number()).optional(),
          })
        ),
      }),
      execute: async ({ items }) => {
        console.log(`[add_to_cart] ${items.map((i) => i.slug).join(", ")}`);
        const results: { name: string; slug: string; success: boolean; error?: string }[] = [];
        const needsModifiers: { slug: string; name: string }[] = [];

        for (const item of items) {
          const sqliteItem = getSqliteItemBySlugFuzzy(item.slug);
          if (!sqliteItem) {
            results.push({ name: item.slug, slug: item.slug, success: false, error: "Item not found" });
            continue;
          }

          // No modifiers provided — check for required groups before adding
          if (!item.modifierIds || item.modifierIds.length === 0) {
            const requiredGroups = db
              .select({ id: modifierGroups.id })
              .from(modifierGroups)
              .where(and(eq(modifierGroups.menuItemId, sqliteItem.id), eq(modifierGroups.required, true)))
              .all();

            if (requiredGroups.length > 0) {
              // Let frontend open modifier tray for this item
              needsModifiers.push({ slug: sqliteItem.slug, name: sqliteItem.name });
              continue;
            }
          }

          const result = await addToCart(sqliteItem.id, item.quantity, item.modifierIds || []);
          if (result && "error" in result) {
            results.push({ name: sqliteItem.name, slug: item.slug, success: false, error: result.error });
          } else {
            results.push({ name: sqliteItem.name, slug: item.slug, success: true });
          }
        }

        const successItems = results.filter((r) => r.success);
        const failedItems = results.filter((r) => !r.success);
        const allSuccess = failedItems.length === 0 && needsModifiers.length === 0;

        return {
          success: allSuccess,
          added: successItems.map((r) => r.name),
          addedSlugs: successItems.map((r) => r.slug),
          needsModifiers, // Frontend opens modifier tray for these
          failed: failedItems.map((r) => ({ name: r.name, reason: r.error })),
          message: successItems.length > 0
            ? `Added ${successItems.map((r) => r.name).join(", ")} to cart!`
            : needsModifiers.length > 0
            ? `${needsModifiers.map((r) => r.name).join(", ")} need customization — pick your options.`
            : `Some items failed: ${failedItems.map((r) => `${r.name} (${r.error})`).join(", ")}`,
        };
      },
    }),

    // 7. Restaurant info + promotions (Supabase)
    get_restaurant_info: tool({
      description: "Get restaurant hours, location, delivery, or promotions.",
      inputSchema: z.object({
        topic: z.string().describe("hours, location, delivery, contact, promotions"),
      }),
      execute: async ({ topic }) => {
        console.log(`[get_restaurant_info] "${topic}"`);
        const lower = topic.toLowerCase();
        if (lower.includes("promo") || lower.includes("deal")) {
          const promos = await getActivePromotions();
          if (promos.length === 0) return { found: false, message: "No active promotions right now." };
          return { found: true, promotions: promos };
        }
        const info = await getRestaurantInfo(topic);
        if (!info) return { found: false, message: `No info found for "${topic}".` };
        return { found: true, info };
      },
    }),

    // 8. Dietary guide (Supabase)
    get_dietary_guide: tool({
      description: "Get dietary recommendations for specific diets.",
      inputSchema: z.object({
        diet: z.string().describe("keto, vegan, vegetarian, gluten-free, dairy-free"),
      }),
      execute: async ({ diet }) => {
        console.log(`[get_dietary_guide] "${diet}"`);
        const guide = await getDietaryGuide(diet);
        if (!guide) return { found: false, message: `No dietary guide for "${diet}".` };
        return { found: true, guide };
      },
    }),

    // 9. Order history — minimal (SQLite)
    get_order_history: tool({
      description: "Get user's past orders for reorder.",
      inputSchema: z.object({
        limit: z.number().optional().default(5),
      }),
      execute: async ({ limit }) => {
        console.log(`[get_order_history] limit:${limit}`);
        const allOrders = await getOrders();
        if (allOrders.length === 0) return { found: false, message: "No order history found." };

        const orders = allOrders.slice(0, limit).map((o) => {
          const items = db
            .select({ name: orderItems.itemName, qty: orderItems.quantity })
            .from(orderItems)
            .where(eq(orderItems.orderId, o.id))
            .all();

          return {
            id: o.id,
            date: o.createdAt,
            total: formatPrice(o.total),
            status: o.status,
            items,
          };
        });

        return { found: true, orders };
      },
    }),

    // 10. Remove from cart by slug (SQLite)
    remove_from_cart: tool({
      description: "Remove an item from the cart by its slug.",
      inputSchema: z.object({
        slug: z.string(),
      }),
      execute: async ({ slug }) => {
        console.log(`[remove_from_cart] "${slug}"`);
        const result = await removeFromCartBySlug(slug);
        if (result && "error" in result) {
          const msg =
            result.error === "not_authenticated"
              ? "You need to log in first."
              : result.error === "item_not_in_cart"
              ? `That item isn't in your cart.`
              : "Couldn't remove that item. Please try again.";
          return { success: false, message: msg };
        }
        return { success: true, removed: slug, message: "Item removed from your cart." };
      },
    }),
  };
}
