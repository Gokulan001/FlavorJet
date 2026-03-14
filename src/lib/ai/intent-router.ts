export type IntentType =
  | "chitchat"
  | "food_search"
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

  // Everything else → food_search: Gemini picks from 5 food tools
  // Covers: dietary, popular/recommendations, category browse, price-based,
  // general search, weather-based, mixed food queries
  return "food_search";
}

// ── Tool map ─────────────────────────────────────────────────────────────────

const TOOL_MAP: Record<IntentType, string[]> = {
  chitchat: [],

  // Gemini picks the right food tool from context (no regex needed)
  // add_to_cart included so Gemini can add when user selects from shown results
  food_search: [
    "search_menu",
    "get_items_by_name",
    "get_category_items",
    "get_popular_items",
    "get_dietary_guide",
    "add_to_cart",
  ],

  // Direct order: lookup + modifiers + add
  direct_order: ["get_items_by_name", "get_modifiers", "add_to_cart"],

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
