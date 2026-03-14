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
  const suggestion =
    weather.temp > 75
      ? "Suggest cold/refreshing items."
      : weather.temp < 55
        ? "Suggest warm/comfort items."
        : "";
  return `Weather: ${weather.temp}°F, ${weather.description}.${suggestion ? " " + suggestion : ""}`;
}

// ── System Prompt Builder ────────────────────────────────────────────────────

export async function buildSystemPrompt(
  language: Language = "en",
  weather?: WeatherData | null,
  cart?: CartContext | null,
  pending?: PendingQueue | null,
  warmSummary?: string | null,
  hasImage?: boolean,
  isVoiceMode?: boolean
): Promise<string> {
  const lang = LANG_NAME[language] || "English";
  const cartJSON = serializeCart(cart);
  const pendingJSON = serializePending(pending);

  const lines: string[] = [
    `You are FlavorJet AI. Help users order food. IMPORTANT: You MUST respond entirely in ${lang}. Do not use English unless ${lang} is English.`,
    `Be concise and friendly. Emojis sparingly.`,
    `Cart: ${cartJSON}`,
  ];

  if (isVoiceMode) {
    lines.push(`## Voice Mode`);
    lines.push(`CRITICAL: You are responding to VOICE. Follow these rules strictly:`);
    lines.push(`- Keep every response under 80 words.`);
    lines.push(`- No markdown: no bullet points, no bold (**), no lists, no dashes starting lines.`);
    lines.push(`- Write numbers as words: "one pizza", "two options", "twelve dollars".`);
    lines.push(`- Natural spoken cadence. Short sentences. Conversational.`);
    lines.push(`- Ambiguous item: say "I found three options: first is X, second is Y, third is Z. Which would you like?"`);
    lines.push(`- Item not found: immediately suggest closest — "I couldn't find that, but I have X and Y. Want one of those?"`);
    lines.push(`- Cart confirmations must be brief: "Added Pepperoni Pizza!" or "Added Caesar Salad with Ranch dressing!"`);
    lines.push(`- Never say "here are some options:" followed by a list. Instead say "I found X, Y, or Z. Which one?"`);
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

  lines.push(`When tools return items: briefly describe what you found (1-2 sentences) and cards show the details. Use bullet points when listing multiple items.`);
  lines.push(`For multi-item orders: confirm added items with '• ItemName (qty) — added ✓' and items needing selection with '• ItemName — see options below:'.`);
  lines.push(`If user mentions price budget (under $X / budget / cheap / affordable): extract the dollar amount and pass it as max_price to search_menu.`);

  // Nutrition guidance — only include if needed to avoid token waste
  if (hasImage) {
    lines.push(`## Nutrition Guidance`);
    lines.push(`When asked about calories/nutrients/macros: Provide estimates (e.g. "~300 cal, 12g protein, 35g carbs, 14g fat per slice"). Always add: "Note: This is an estimate based on typical recipes — not exact data."`);
  }
  if (hasImage) {
    lines.push(`## Vision Mode — User shared an image`);
    lines.push(`Step 1: Visually identify what food item(s) are in the image.`);
    lines.push(`Step 2: Based on what the user is asking, handle one of these scenarios:`);
    lines.push(`- "Do you have this?" / "Is this on the menu?" → First describe what you see (e.g. "This looks like a fresh green salad with tomatoes and feta..."). Then call search_menu with a short description of the food (e.g. "pepperoni pizza", "caesar salad"). Use limit=3. Show closest matches.`);
    lines.push(`- "Add this" / "I want this" → search first to find the exact slug, then call add_to_cart with that slug.`);
    lines.push(`- "What are the nutrients?" / "Is this healthy?" → use your food knowledge to estimate calories, protein, carbs, fats. Always add: "Note: FlavorJet doesn't have exact nutritional data yet — this is an estimate based on typical recipes." Then suggest similar healthy items from the menu if relevant.`);
    lines.push(`- "Is this vegan/gluten-free/etc.?" → analyze the image and give a warm, friendly answer like "This looks like it could be vegan — it's typically plant-based! Great choice for a light meal 🌱". Then optionally call get_dietary_guide for more detail.`);
    lines.push(`- Multiple questions at once → handle each in order: identify → search → nutrition/health → add if requested.`);
    lines.push(`If the image food is not on our menu: say "We don't have [item] on our menu right now, but here are some similar options you might enjoy:" and search for closest alternatives.`);
  } else {
    lines.push(`For image-based food searches: use limit=3 in search_menu to show only the closest matches.`);
  }
  lines.push(`Never guess prices or availability — use tools.`);

  // Tool usage guidance — prevents slug mismatches, redundant calls, and hallucinated confirmations
  lines.push(`## Tool Usage Rules`);
  lines.push(`- When calling add_to_cart: ALWAYS use the exact slug from previous tool results (e.g. "classic-caesar-salad", not "salad" or "caesar-salad"). Never invent or shorten slugs.`);
  lines.push(`- If add_to_cart returns needsModifiers array: tell the user those items need customization. The app will show a modifier picker automatically — do NOT repeat the add_to_cart call for those items.`);
  lines.push(`- After a successful add_to_cart, do NOT call search_menu or get_items_by_name for the same items. Only search again if the user asks for something new.`);
  lines.push(`- For multi-item orders: batch ALL items in a single add_to_cart call with the items array. Do not make separate add_to_cart calls per item.`);
  lines.push(`- Never say "added ✓" unless add_to_cart tool was actually called and returned success. If you haven't called the tool, call it first.`);

  return lines.join("\n");
}
