import type { UIMessage } from "ai";

// ── Mode & State ────────────────────────────────────────────────────────────
export type ChatMode = "chat" | "voice";
export type VoiceState = "idle" | "listening" | "processing" | "speaking";

// ── Language ────────────────────────────────────────────────────────────────
export type Language =
  | "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh"
  | "hi" | "ta" | "ar" | "ru" | "tr" | "pl" | "nl" | "cs" | "sv"
  | "da" | "fi" | "no" | "sk" | "id" | "ms" | "vi" | "th" | "fil"
  | "uk" | "el";

export const LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", flag: "🇮🇳" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "ru", name: "Russian", flag: "🇷🇺" },
  { code: "tr", name: "Turkish", flag: "🇹🇷" },
];

// ── Weather ─────────────────────────────────────────────────────────────────
export interface WeatherData {
  temp: number;
  feels_like: number;
  description: string;
  humidity: number;
}

// ── Token Usage ─────────────────────────────────────────────────────────────
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  toolCalls: number;
}

// ── Modifiers ───────────────────────────────────────────────────────────────
export interface ModifierOption {
  id: number;
  name: string;
  price: string;
}

export interface ModifierGroup {
  name: string;
  required: boolean;
  options: ModifierOption[];
}

export interface PendingModifiers {
  itemId: number;
  itemName: string;
  itemPrice: string;
  groups: ModifierGroup[];
  currentGroupIndex: number;
  selections: Record<string, number[]>; // groupName → selected modifier IDs
}

// ── Voice Modifier Session (group-by-group voice ordering) ──────────────────
export interface VoiceModifierOptionData {
  id: number;
  name: string;
  priceDelta: number;
}

export interface VoiceModifierGroupData {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: VoiceModifierOptionData[];
}

export interface VoiceModifierSession {
  slug: string;
  itemName: string;
  basePriceCents: number;
  groups: VoiceModifierGroupData[];
  currentGroupIndex: number;
  selections: Record<string, number[]>; // groupId (string) → selected option IDs
}

// ── Orders ──────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  quantity: number;
  modifiers?: number[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
export function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function makeUIMessage(
  role: "user" | "assistant",
  text: string,
  id?: string
): UIMessage {
  return {
    id: id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    role,
    parts: [{ type: "text", text }],
  };
}

// ── localStorage Keys ───────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  preferredMode: "fj-ai-mode",
  preferredLang: "fj-ai-lang",
  pendingQueue: "fj-ai-pending-queue",
} as const;

// ── Pending Queue (multi-intent order tracking) ────────────────────────────
export type ItemStatus =
  | "searching"
  | "needs_clarification"
  | "awaiting_modifier"
  | "modifier_done"
  | "added"
  | "not_found";

export interface PendingItem {
  id: string;
  rawName: string;
  qty: number;
  slug?: string;
  itemId?: number;
  status: ItemStatus;
  modifiers?: { groupId: number; optionId: number }[];
}

export interface PendingQueue {
  items: PendingItem[];
  focusId: string | null;
}

// ── Cart Context (injected into system prompt) ─────────────────────────────
export interface CartContext {
  items: { name: string; qty: number; price: string; slug: string }[];
  total: string;
}

// ── Full Cart Item (rich data for sidebar display & editing) ───────────────
export interface FullCartItem {
  id: number;
  quantity: number;
  specialInstructions: string | null;
  menuItemId: number;
  itemName: string;
  itemSlug: string;
  itemPrice: number;
  itemImage: string | null;
  modifiers: { id: number; name: string; priceAdjustment: number; groupName: string }[];
  unitPrice: number;
  lineTotal: number;
}

// ── Minimal Menu Item (what AI tool results return) ────────────────────────
export interface MinimalMenuItem {
  name: string;
  price: string;
  slug: string;
  imageUrl?: string; // optional — resolved client-side via MenuImagesContext
  rating: string;
  hasModifiers: boolean;
  vegan: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
}
