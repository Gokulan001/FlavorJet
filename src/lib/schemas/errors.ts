import { z } from "zod";

export const APIError = z.object({
  error: z.string(),
  details: z.any().optional(),
});

export type APIError = z.infer<typeof APIError>;

export const TokenUsage = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  toolCalls: z.number(),
});

export type TokenUsage = z.infer<typeof TokenUsage>;
