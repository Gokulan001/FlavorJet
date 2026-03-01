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

export function extractItemIds(text: string): OrderItem[] | null {
  const match = text.match(/ITEMS:([^\n]+)/);
  if (!match) return null;
  try {
    return match[1].trim().split(";").map((item) => {
      const parts = item.split(":");
      const id = parts[0].trim();
      const quantity = parseInt(parts[1]?.trim()) || 1;
      const modifiers = parts[2]
        ? parts[2].split(",").map((m) => parseInt(m.trim())).filter(Boolean)
        : undefined;
      return { id, quantity, modifiers };
    });
  } catch {
    return null;
  }
}

export function extractModifiers(
  text: string
): { itemId: number; itemName: string; itemPrice: string; groups: ModifierGroup[] } | null {
  const match = text.match(/MODIFIERS:(\d+)\|([^|]+)\|([^|]+)\|(.+)/);
  if (!match) return null;
  try {
    const itemId = parseInt(match[1]);
    const itemName = match[2];
    const itemPrice = match[3];
    const groupsJson = JSON.parse(match[4]);
    return { itemId, itemName, itemPrice, groups: groupsJson };
  } catch {
    return null;
  }
}

export function cleanMarkers(text: string): string {
  return text
    .replace(/\s*ITEMS:[^\n]+/g, "")
    .replace(/\s*MODIFIERS:[^\n]+/g, "")
    .trim();
}

// ── localStorage Keys ───────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  hasOnboarded: "fj-ai-onboarded",
  preferredMode: "fj-ai-mode",
  preferredLang: "fj-ai-lang",
} as const;
