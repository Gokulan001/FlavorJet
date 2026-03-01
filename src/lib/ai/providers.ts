import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";

// ── Model Registry ───────────────────────────────────────────────────────────
// Swap the default by changing AI_PROVIDER env var: "google" | "openai" | "anthropic"

export const MODELS = {
  google: {
    name: "Gemini 2.5 Flash",
    model: google("gemini-2.5-flash"),
  },
  openai: {
    name: "GPT-4o Mini",
    model: openai("gpt-4o-mini"),
  },
  anthropic: {
    name: "Claude Sonnet 4",
    model: anthropic("claude-sonnet-4-20250514"),
  },
} as const;

export type AIProvider = keyof typeof MODELS;

export function getModel() {
  const provider = (process.env.AI_PROVIDER || "google") as AIProvider;
  const entry = MODELS[provider] ?? MODELS.google;
  return entry.model;
}

export function getModelName() {
  const provider = (process.env.AI_PROVIDER || "google") as AIProvider;
  return MODELS[provider]?.name ?? MODELS.google.name;
}
