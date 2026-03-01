import { getCategoryList } from "./menu-context";

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

// ── Token-Optimized System Prompt ────────────────────────────────────────────
// ~800 tokens instead of ~3000. Menu fetched via tools on-demand.

export function buildSystemPrompt(language: Language = "en", weather?: WeatherData | null): string {
  const lang = LANG_NAME[language] || "English";
  const categoryList = getCategoryList();

  // Only include weather section if weather data exists (~60 tokens saved when absent)
  const weatherBlock = weather
    ? `\nWEATHER: ${weather.temp}°F, ${weather.description}. ${weather.temp > 75 ? "Suggest cold/refreshing items." : weather.temp < 55 ? "Suggest warm/comfort items." : ""}`
    : "";

  return `You are FlavorJet's AI ordering assistant. Respond ONLY in ${lang}.

STYLE: No markdown/asterisks. Use emojis sparingly (🍔🥤🔥✨🎉). Be concise, enthusiastic, conversational.

RESTAURANT: FlavorJet — Premium Dining
CATEGORIES: ${categoryList}${weatherBlock}

USE TOOLS to look up menu items. Do NOT guess prices or IDs — always use search_menu or get_category_items first.

ORDERING RULES:
1. Single item added → acknowledge, suggest complement, ask "Anything else?"
2. Multiple items in one message → show summary, ask "Ready to add to cart?"
3. User says "no/that's it" → show order with prices, ask "Ready to add to cart?" (NO ITEMS: marker)
4. User confirms "yes/add it" → output ITEMS: marker. Format: ITEMS:id:qty or ITEMS:id1:qty1;id2:qty2

MODIFIER ITEMS: If item has modifiers (hasModifiers=true), tell user to customize via the customizeUrl link. Do NOT add via ITEMS: marker.

ITEMS: MARKER: Only on explicit user confirmation. Use exact numeric IDs from tool results.

CONTEXT: Remember prior messages. Don't re-ask answered questions. "2 burgers" then "spicy" = "2 spicy burgers."`;
}
