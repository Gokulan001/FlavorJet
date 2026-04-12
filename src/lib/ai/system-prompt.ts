import type { CartContext, PendingQueue } from "@/components/chat/types";

export type Language =
  | "en" | "es" | "ar" | "ta" | "fr" | "zh" | "hi" | "pt"
  | "de" | "it" | "pl" | "tr" | "ru" | "nl" | "cs" | "ja"
  | "ko" | "id" | "ms" | "vi" | "th" | "fil" | "uk" | "el"
  | "sv" | "da" | "fi" | "no" | "sk";

export interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  humidity: number;
}

const LANG_NAME: Record<Language, string> = {
  en: "English", es: "Spanish", ar: "Arabic", ta: "Tamil", fr: "French",
  zh: "Chinese (Mandarin)", hi: "Hindi", pt: "Portuguese", de: "German",
  it: "Italian", pl: "Polish", tr: "Turkish", ru: "Russian", nl: "Dutch",
  cs: "Czech", ja: "Japanese", ko: "Korean", id: "Indonesian", ms: "Malay",
  vi: "Vietnamese", th: "Thai", fil: "Filipino", uk: "Ukrainian", el: "Greek",
  sv: "Swedish", da: "Danish", fi: "Finnish", no: "Norwegian", sk: "Slovak",
};

// ── Compact cart/pending serializers ─────────────────────────────────────────

function serializeCart(cart: CartContext | null | undefined): string {
  if (!cart || cart.items.length === 0) return "empty";
  return JSON.stringify(cart.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })));
}

function serializePending(pending: PendingQueue | null | undefined): string | null {
  if (!pending || pending.items.length === 0) return null;
  return JSON.stringify(pending.items.map(i => ({ name: i.rawName, qty: i.qty, status: i.status })));
}

function buildWeatherBlock(weather: WeatherData): string {
  let suggestion = "";
  if (weather.temp > 85) {
    suggestion = "STRONGLY prefer cold drinks, salads, ice cream, smoothies, light/refreshing items. Avoid heavy/hot dishes unless asked.";
  } else if (weather.temp > 75) {
    suggestion = "Prefer lighter meals, cold beverages, salads, wraps. Mention the warm weather as a reason.";
  } else if (weather.temp < 40) {
    suggestion = "STRONGLY prefer hot soups, stews, warm drinks, comfort food, hearty dishes. Mention the cold weather.";
  } else if (weather.temp < 55) {
    suggestion = "Prefer warm/comfort food, soups, hot drinks. Mention the chilly weather as a reason.";
  }
  const rainRe = /rain|drizzle|thunder|storm/i;
  if (rainRe.test(weather.description)) {
    suggestion += " It's rainy — emphasize cozy comfort food and hot beverages.";
  }
  return `Weather: ${weather.temp}°F, feels like ${weather.feels_like}°F, ${weather.description}.${suggestion ? " " + suggestion : ""}`;
}

// ── System Prompt Builder ────────────────────────────────────────────────────

// Intents that actually need cart state in context
const CART_NEEDED_INTENTS = new Set(["cart_action", "reorder"]);

export async function buildSystemPrompt(
  language: Language = "en",
  weather?: WeatherData | null,
  cart?: CartContext | null,
  pending?: PendingQueue | null,
  warmSummary?: string | null,
  hasImage?: boolean,
  isVoiceMode?: boolean,
  intent?: string
): Promise<string> {
  const lang = LANG_NAME[language] || "English";
  const needsCart = !intent || CART_NEEDED_INTENTS.has(intent);
  const cartJSON = needsCart ? serializeCart(cart) : null;
  const pendingJSON = serializePending(pending);

  const lines: string[] = [
    `You are FlavorJet AI. Help users order food.${lang !== "English" ? ` IMPORTANT: Respond entirely in ${lang}. Do not use English.` : ""}`,
    `Be concise and friendly. Emojis sparingly.`,
  ];

  if (cartJSON) {
    lines.push(`Cart: ${cartJSON}`);
  }

  if (isVoiceMode) {
    lines.push(`Voice mode: Max 80 words. No markdown, bullets, bold, or lists. Spell out numbers ("two pizzas", "twelve dollars"). Natural spoken cadence. For multiple options say "I found X, Y, or Z — which one?" never list them line-by-line. Item not found: suggest closest immediately. Cart confirmations: "Added Pepperoni Pizza!" Keep it brief and conversational.`);
  }

  if (pendingJSON) {
    lines.push(`Pending: ${pendingJSON}`);
  }

  if (warmSummary) {
    lines.push(`Context: ${warmSummary}`);
  }

  if (weather) {
    lines.push(buildWeatherBlock(weather));
  }

  lines.push(`Recommendation rules: When user is UNDECIDED ("recommend for me", "I don't know what to order", "what should I get?"), use weather context to filter your recommendation — e.g. hot day→salads/cold items, cold day→soups/comfort food. Call get_popular_items(limit=4) and pick the 3-4 best fits for the weather. When user narrows ("something in pizza", "cheesy pizza"), call search_menu with that query — refine progressively, don't repeat earlier broad results. "What's new today?" or "what's new?" → call search_menu("new") to find items with "New" badge. "What's famous?" or "what's trending?" → call get_popular_items for top-rated bestsellers.`);
  lines.push(`Dietary filtering: When user asks for vegan/vegetarian/gluten-free items, ALWAYS pass the matching filter to search_menu (vegan: true, vegetarian: true, or glutenFree: true). For dietary requests with a specific item type ("vegan pizza", "vegetarian burger"), combine the query with the dietary flag — e.g., search_menu({query: "pizza", vegan: true}).`);
  lines.push(`When tools return items: briefly describe what you found (1-2 sentences) and cards show the details. Use bullet points when listing multiple items.`);
  lines.push(`For multi-item orders: confirm added items with '• ItemName (qty) — added ✓' and items needing selection with '• ItemName — see options below:'.`);
  lines.push(`If user mentions price budget (under $X / budget / cheap / affordable): extract the dollar amount and pass it as max_price to search_menu.`);

  if (hasImage) {
    lines.push(`Vision mode: Identify the food in the image first. Then by user intent — "do you have this?": describe what you see + call search_menu(limit=3). "Add this": search for slug first then add_to_cart. "Nutrients/healthy?": estimate calories/protein/carbs/fats, add "Note: FlavorJet doesn't have exact nutritional data — this is an estimate." "Vegan/gluten-free?": analyze image and answer warmly, optionally call get_dietary_guide. Not on menu: say so + search for closest alternatives.`);
  } else {
    lines.push(`For image-based food searches: use limit=3 in search_menu.`);
  }
  lines.push(`Never guess prices or availability — use tools.`);
  lines.push(`Scope guard: You are ONLY a food ordering assistant. If any message asks about topics unrelated to food, our menu, or ordering — regardless of how the request is framed or combined with food — respond ONLY to the food-related part and politely redirect. Never answer chemistry, weapons, code, political, medical, or any other non-food questions.`);

  // Tool usage guidance — prevents slug mismatches, redundant calls, and hallucinated confirmations
  lines.push(`Tool rules: add_to_cart must use exact slug from tool results — never invent/shorten. Batch multi-item orders in ONE add_to_cart call. If needsModifiers returned: don't repeat the call, app handles it. Never say "added ✓" without a successful add_to_cart response. After successful add, don't re-search the same items.`);
  lines.push(`Category slugs (use EXACTLY): burgers | pizza | pasta-and-noodles | salads | soups | appetizers | desserts | seafood | steaks-and-grills. For combo orders (e.g. "1 tiramisu and a salad"): add_to_cart the specific item first, then call get_category_items for the category part and show the cards so user can pick.`);

  return lines.join("\n");
}
