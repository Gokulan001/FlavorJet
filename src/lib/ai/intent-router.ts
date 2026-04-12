export type IntentType =
  | "chitchat"
  | "food_search"
  | "category_browse"
  | "popular_browse"
  | "dietary_search"
  | "direct_order"
  | "info"
  | "reorder"
  | "image"
  | "cart_action";

// ── Reliable regex patterns (clear signal, low false-positive rate) ───────────

// Only matches pure greetings/farewells (saves full API round-trip via tryLocalResponse)
const CHITCHAT_RE = /^(hi|hey|hello|thanks|thank you|bye|goodbye|ok|okay|yes|no|sure|great|cool|nice|yep|nope|alright|perfect|awesome|wonderful)[\s!?.]*$/i;

// Very distinct phrases — safe to regex-detect
const REORDER_RE = /\b(reorder|my usual|last order|same as before|order again|previous order)\b/i;

// Cart modification verbs — distinct enough to route safely
const CART_RE = /\b(remove|delete|clear)\b.{0,30}\b(cart|basket|order)\b|\b(my cart|view cart|show cart|cart items|what('?s| is) in my cart)\b/i;

// Restaurant operational info — very distinct keywords
const INFO_RE = /\b(hours?|open(ing)?|clos(e[ds]?|ing)|location|deliver[ys]?|phone|contact|address|where are you|when .{0,10}open)\b/i;

// Clear ordering intent: number + food, or explicit "I want/need/order" verbs
// Intentionally excludes "add" alone (too broad — "add variety", "add some")
const DIRECT_ORDER_RE = /(\b\d+\s+\w+|\b(i need|i want|order|get me|give me|i'?ll have|i'?ll take|can i get|lemme get|make it)\b)/i;

// Category browse: "show me X", "list X", "what X do you have", "all X"
const CATEGORY_RE = /\b(show me|list|all|browse|see|what('?s| are).{0,10}(in|under)?)\b.{0,30}\b(menu|items?|food|options?|category|categories)\b|\b(burgers?|pizzas?|pastas?|salads?|sandwiches?|tacos?|wraps?|bowls?|soups?|desserts?|drinks?|beverages?|starters?|appetizers?|mains?|sides?)\b/i;

// Popular / recommendations — very distinct keywords
const POPULAR_RE = /\b(popular|best.?seller|trending|top.rated|recommend|favorite|famous|most.ordered|what.*people.*love|what.*good|what.*try|what.*suggest|what'?s?\s*new|new\s*(today|items?|dishes?)?)\b/i;

// Dietary queries — explicit diet keywords
const DIETARY_RE = /\b(vegan|vegetarian|gluten.?free|keto|dairy.?free|nut.?free|halal|kosher|low.?carb|healthy|plant.?based)\b/i;

// ── Intent detection ─────────────────────────────────────────────────────────

export function detectIntent(message: string, hasImage?: boolean): IntentType {
  if (hasImage) return "image";

  const trimmed = message.trim();

  // Pure greetings/thanks → handled locally (no API call needed)
  if (trimmed.length < 5 || CHITCHAT_RE.test(trimmed)) return "chitchat";

  // Reliable domain-specific intents
  if (REORDER_RE.test(trimmed)) return "reorder";
  if (CART_RE.test(trimmed)) return "cart_action";
  if (INFO_RE.test(trimmed)) return "info";

  // Clear order signal → ordering tools
  if (DIRECT_ORDER_RE.test(trimmed)) return "direct_order";

  // Specific browse intents — send minimal tools
  if (DIETARY_RE.test(trimmed)) return "dietary_search";
  if (POPULAR_RE.test(trimmed)) return "popular_browse";
  if (CATEGORY_RE.test(trimmed)) return "category_browse";

  // General food search fallback (ambiguous queries like "something spicy", "light meal")
  return "food_search";
}

// ── Tool map ─────────────────────────────────────────────────────────────────

const TOOL_MAP: Record<IntentType, string[]> = {
  chitchat: [],

  // General/ambiguous food queries — search + add only
  food_search: ["search_menu", "add_to_cart"],

  // Category browse — user wants to see items in a category
  category_browse: ["get_category_items", "search_menu", "add_to_cart"],

  // Popular/recommendations — user wants top items
  popular_browse: ["get_popular_items", "search_menu", "add_to_cart"],

  // Dietary — user has a diet constraint
  dietary_search: ["get_dietary_guide", "search_menu", "add_to_cart"],

  // Direct order: exact name lookup OR category browse (for combos like "1 tiramisu and a salad") + modifiers + add
  direct_order: ["get_items_by_name", "search_menu", "get_category_items", "get_modifiers", "add_to_cart"],

  // Cart remove
  cart_action: ["remove_from_cart"],

  // Info only
  info: ["get_restaurant_info"],

  // Reorder: history + modifiers + add
  reorder: ["get_order_history", "get_modifiers", "add_to_cart"],

  // Image: full toolset — Gemini reads image, searches, can add, check dietary info
  image: ["search_menu", "get_items_by_name", "add_to_cart", "get_modifiers", "get_dietary_guide"],
};

export function getToolsForIntent(
  intent: IntentType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allTools: Record<string, any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  const toolNames = TOOL_MAP[intent];
  if (toolNames.length === 0) return {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered: Record<string, any> = {};
  for (const name of toolNames) {
    if (allTools[name]) {
      filtered[name] = allTools[name];
    }
  }
  return filtered;
}
