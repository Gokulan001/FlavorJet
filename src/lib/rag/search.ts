import { embedText } from "./embeddings";
import { searchSimilar } from "./pinecone";
import { getMenuItemsByIds } from "@/lib/supabase/queries/menu";
import type { MenuItemResult } from "@/lib/supabase/queries/menu";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult extends MenuItemResult {
  score: number; // Pinecone similarity score (0-1)
}

export interface PriceFilter {
  maxDollars?: number; // e.g. 12 for "under $12"
  minDollars?: number; // e.g. 20 for "over $20"
}

// ── Category Detection ───────────────────────────────────────────────────────
// Map user query keywords to actual Supabase category slugs.
// Slugs: burgers | pizza | pasta-and-noodles | salads | soups | appetizers | desserts | seafood | steaks-and-grills
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "burgers": ["burger", "burgers", "patty", "smash burger"],
  "pizza": ["pizza", "pizzas", "margherita", "pepperoni"],
  "salads": ["salad", "salads", "caesar", "greek salad"],
  "pasta-and-noodles": ["pasta", "pastas", "spaghetti", "noodle", "noodles", "carbonara", "fettuccine", "penne", "linguine", "risotto"],
  "seafood": ["fish", "salmon", "shrimp", "crab", "seafood", "lobster", "scallop", "tuna", "clam", "chowder"],
  "desserts": ["dessert", "desserts", "cake", "brownie", "tiramisu", "cheesecake", "pudding", "ice cream", "tart", "sweet"],
  "soups": ["soup", "soups", "bisque", "broth", "stew"],
  "appetizers": ["appetizer", "appetizers", "starter", "starters", "wings", "rings", "bruschetta", "poppers", "dip"],
  "steaks-and-grills": ["steak", "steaks", "grill", "grilled", "ribeye", "sirloin", "bbq", "barbecue", "beef"],
};

function detectCategory(query: string): string | null {
  const lowerQuery = query.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      return category;
    }
  }
  return null;
}

// ── Semantic Search Pipeline ─────────────────────────────────────────────────
// 1. Embed the user's query with gemini-embedding-001
// 2. Search Pinecone for similar menu item vectors
// 3. Enrich top results with live Supabase data (price, availability, full details)
// 4. Optionally filter by price (in-memory, parses "$12.99" format)
// 5. Return results ordered by similarity score

export async function semanticSearch(
  query: string,
  topK: number = 6,
  priceFilter?: PriceFilter
): Promise<SearchResult[]> {
  try {
    // Fetch more items when price-filtering so we have enough after filtering
    const fetchK = priceFilter ? Math.max(topK * 2, 12) : topK;

    // Step 1: Embed the query (use RETRIEVAL_QUERY task type for search queries)
    const queryVector = await embedText(query);

    // Step 2: Search Pinecone for similar vectors
    const matches = await searchSimilar(queryVector, fetchK);

    if (matches.length === 0) return [];

    // Step 3: Extract Supabase IDs from Pinecone results
    const supabaseIds = matches
      .map((m) => parseInt(m.id))
      .filter((id) => !isNaN(id));

    if (supabaseIds.length === 0) return [];

    // Step 4: Enrich with live Supabase data
    const enrichedItems = await getMenuItemsByIds(supabaseIds);

    // Step 5: Merge Pinecone scores with Supabase data, maintain score order
    const scoreMap = new Map(matches.map((m) => [parseInt(m.id), m.score ?? 0]));

    let results: SearchResult[] = enrichedItems
      .map((item) => ({
        ...item,
        score: scoreMap.get(item.id) ?? 0,
      }))
      .sort((a, b) => b.score - a.score);

    // Step 6: Smart category filtering (if user mentioned a specific category)
    const detectedCategory = detectCategory(query);
    if (detectedCategory) {
      results = results.filter((item) =>
        item.categorySlug.toLowerCase() === detectedCategory.toLowerCase()
      );
      console.log(`[search_menu] Category filter applied: "${detectedCategory}" (${results.length} items)`);
    }

    // Step 7: In-memory price filtering (Supabase price is a formatted string e.g. "$12.99")
    if (priceFilter) {
      results = results.filter((item) => {
        const price = parseFloat(item.price.replace(/[^0-9.]/g, ""));
        if (isNaN(price)) return true; // Keep items with unparseable prices
        if (priceFilter.maxDollars !== undefined && price > priceFilter.maxDollars) return false;
        if (priceFilter.minDollars !== undefined && price < priceFilter.minDollars) return false;
        return true;
      });
    }

    return results.slice(0, topK);
  } catch (error) {
    console.error("[RAG Search] Error:", error);
    return [];
  }
}
