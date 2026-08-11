import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";

// ── Model Registry ───────────────────────────────────────────────────────────
// Swap the default by changing AI_PROVIDER env var: "google" | "openai" | "anthropic"

// @ai-sdk/anthropic treats ANTHROPIC_BASE_URL as the full base URL (no /v1
// appended), unlike @anthropic-ai/sdk (used in packages/mcp-host) which adds
// /v1 itself. Our gateway needs /v1/messages, so append it explicitly here
// rather than changing the shared env var and breaking the MCP host.
const anthropic = createAnthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL
    ? `${process.env.ANTHROPIC_BASE_URL}/v1`
    : undefined,
});

export const MODELS = {
  google: {
    name: "Gemini 2.5 Flash Lite",
    model: google("gemini-2.5-flash-lite"),
  },
  openai: {
    name: "GPT-4o Mini",
    model: openai("gpt-4o-mini"),
  },
  anthropic: {
    name: "Claude Haiku 4.5",
    model: anthropic("claude-haiku-4-5"),
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
