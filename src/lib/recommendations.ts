import { db } from "@/db";
import { menuItems, categories, modifierGroups } from "@/db/schema";
import { eq, and, inArray, notInArray, desc } from "drizzle-orm";

export interface RecommendedItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  rating: string;
  categorySlug: string;
  categoryName: string;
  hasModifiers: boolean;
}

// Which categories complement each other
const CATEGORY_PAIRINGS: Record<string, string[]> = {
  appetizers: ["burgers", "pizza", "steaks-and-grills"],
  salads: ["pasta-and-noodles", "seafood", "soups"],
  soups: ["salads", "burgers", "pasta-and-noodles"],
  "pasta-and-noodles": ["salads", "appetizers", "desserts"],
  burgers: ["appetizers", "desserts", "soups"],
  pizza: ["appetizers", "salads", "desserts"],
  seafood: ["salads", "soups", "desserts"],
  desserts: ["pizza", "burgers", "pasta-and-noodles"],
  "steaks-and-grills": ["appetizers", "salads", "desserts"],
};

const MAX_RECOMMENDATIONS = 6;

export function getRecommendations(
  cartCategoryIds: number[],
  cartMenuItemIds: number[]
): RecommendedItem[] {
  try {
    if (cartCategoryIds.length === 0) return [];

    // Get slugs for cart categories
    const cartCategories = db
      .select({ slug: categories.slug })
      .from(categories)
      .where(inArray(categories.id, cartCategoryIds))
      .all();

    const cartCategorySlugs = cartCategories.map((c) => c.slug);

    // Collect complementary category slugs (deduplicated, exclude cart categories)
    const complementarySlugs = new Set<string>();
    for (const slug of cartCategorySlugs) {
      const pairings = CATEGORY_PAIRINGS[slug];
      if (pairings) {
        for (const p of pairings) {
          if (!cartCategorySlugs.includes(p)) {
            complementarySlugs.add(p);
          }
        }
      }
    }

    if (complementarySlugs.size === 0) return [];

    // Get category IDs for complementary slugs
    const compCategories = db
      .select({ id: categories.id, slug: categories.slug, name: categories.name })
      .from(categories)
      .where(inArray(categories.slug, [...complementarySlugs]))
      .all();

    const compCategoryIds = compCategories.map((c) => c.id);
    const categoryMap = new Map(compCategories.map((c) => [c.id, { slug: c.slug, name: c.name }]));

    if (compCategoryIds.length === 0) return [];

    // Fetch available items from complementary categories, excluding what's in cart
    const baseConditions = [
      inArray(menuItems.categoryId, compCategoryIds),
      eq(menuItems.isAvailable, true),
    ];

    if (cartMenuItemIds.length > 0) {
      baseConditions.push(notInArray(menuItems.id, cartMenuItemIds));
    }

    const items = db
      .select({
        id: menuItems.id,
        name: menuItems.name,
        slug: menuItems.slug,
        price: menuItems.price,
        imageUrl: menuItems.imageUrl,
        rating: menuItems.rating,
        categoryId: menuItems.categoryId,
      })
      .from(menuItems)
      .where(and(...baseConditions))
      .orderBy(desc(menuItems.rating))
      .limit(MAX_RECOMMENDATIONS)
      .all();

    // Check which items have modifiers
    const itemIds = items.map((i) => i.id);
    const itemsWithModifiers = new Set<number>();

    if (itemIds.length > 0) {
      const modGroups = db
        .select({ menuItemId: modifierGroups.menuItemId })
        .from(modifierGroups)
        .where(inArray(modifierGroups.menuItemId, itemIds))
        .all();

      for (const mg of modGroups) {
        itemsWithModifiers.add(mg.menuItemId);
      }
    }

    return items.map((item) => {
      const cat = categoryMap.get(item.categoryId);
      return {
        id: item.id,
        name: item.name,
        slug: item.slug,
        price: item.price,
        imageUrl: item.imageUrl,
        rating: item.rating,
        categorySlug: cat?.slug ?? "",
        categoryName: cat?.name ?? "",
        hasModifiers: itemsWithModifiers.has(item.id),
      };
    });
  } catch {
    return [];
  }
}
