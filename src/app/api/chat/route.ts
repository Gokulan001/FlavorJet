import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/providers";
import { buildSystemPrompt, type Language, type WeatherData } from "@/lib/ai/system-prompt";
import { createRAGTools } from "@/lib/rag/tools";
import { detectIntent, getToolsForIntent } from "@/lib/ai/intent-router";
import { semanticCache, SemanticInputCache } from "@/lib/cache/semanticInputCache";
import { rateLimit } from "@/lib/security/rateLimit";
import type { CartContext, PendingQueue } from "@/components/chat/types";

// ── Request Validation Schema ───────────────────────────────────────────────

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.any()),
  })).min(1, "At least one message required"),
  language: z.string().optional(),
  weather: z.object({
    temp: z.number(),
    feels_like: z.number().optional(),
    description: z.string(),
    humidity: z.number().optional(),
    icon: z.string().optional(),
  }).nullable().optional(),
  cartContext: z.object({
    items: z.array(z.object({
      name: z.string(),
      qty: z.number(),
      price: z.string(),
      slug: z.string().optional(),
    })),
    total: z.string(),
  }).nullable().optional(),
  pendingQueue: z.any().nullable().optional(),
  isVoiceMode: z.boolean().optional(),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function getUIMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ── Strip imageUrl from tool outputs (saves ~400-600 tokens per turn) ────────
// imageUrl is only needed by the frontend for rendering cards, not by the AI.

function stripImagesFromToolOutputs(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => ({
    ...msg,
    parts: msg.parts.map((part) => {
      if (!part.type.startsWith("tool-")) return part;

      const tp = part as unknown as { type: string; state: string; output?: unknown };
      if (tp.state !== "output-available" || !tp.output) return part;

      const output = tp.output as Record<string, unknown>;
      if (!output.items || !Array.isArray(output.items)) return part;

      // Remove imageUrl from each item in the output
      const stripped = {
        ...output,
        items: (output.items as Record<string, unknown>[]).map(({ imageUrl: _u, ...rest }) => rest),
      };

      return { ...part, output: stripped } as unknown as typeof part;
    }),
  }));
}

// ── Extract image context from assistant response ────────────────────────────
// Looks at what the assistant identified in the image, then adds that as text
// context when we strip the image data. This preserves conversational context.

function extractImageContext(assistantResponse: string): string | null {
  // Try to find common food item names the assistant would mention
  const patterns = [
    /we have\s+(?:a\s+)?([^.!]+?)(?:\s+\(|[.!]|—|—|with|for)/i,
    /yes[^.]*?(?:we\s+)?(?:have|offer)\s+(?:a\s+)?([^.!]+?)(?:\s+\(|[.!]|—|with)/i,
    /that's\s+(?:a\s+)?([^.!]+?)(?:\s+\(|[.!]|—|with)/i,
    /looks like\s+(?:a\s+)?([^.!]+?)(?:\s+\(|[.!]|—|with)/i,
  ];

  for (const pattern of patterns) {
    const match = assistantResponse.match(pattern);
    if (match && match[1]) {
      return `[Image: ${match[1].trim()}]`;
    }
  }

  // Fallback: detect intent from keywords
  if (assistantResponse.match(/don't have|not on menu/i)) {
    return `[Image: searched item (not on menu)]`;
  }
  if (assistantResponse.match(/cannot|unclear|non-food|appropriate/i)) {
    return `[Non-food or unclear image]`;
  }

  // Last resort
  return `[Food image]`;
}

// ── Strip uploaded image data from older messages (saves tokens) ─────────────
// Only keeps file parts in the most recent message that contains them.
// When stripping older images, adds text context extracted from the assistant's
// response so follow-up questions have context about what was in the image.

function stripOldImageParts(messages: UIMessage[]): UIMessage[] {
  let lastImageIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].parts.some((p) => p.type === "file")) {
      lastImageIdx = i;
      break;
    }
  }
  if (lastImageIdx === -1) return messages;

  return messages.map((msg, idx) => {
    if (idx === lastImageIdx) return msg;
    if (!msg.parts.some((p) => p.type === "file")) return msg;

    // If this user message has an image, look at the next assistant message
    // to extract context, then replace image with that context as text
    const hasImage = msg.parts.some((p) => p.type === "file");
    if (hasImage) {
      // Find the next assistant message
      const nextMsgIdx = idx + 1;
      const nextMsg = nextMsgIdx < messages.length ? messages[nextMsgIdx] : null;

      if (nextMsg && nextMsg.role === "assistant") {
        const assistantText = getUIMessageText(nextMsg);
        const context = extractImageContext(assistantText);

        if (context) {
          // Replace image parts with text context
          const withoutImage = msg.parts.filter((p) => p.type !== "file");
          const contextPart: { type: "text"; text: string } = {
            type: "text",
            text: context,
          };

          return {
            ...msg,
            parts: [contextPart, ...withoutImage],
          };
        }
      }
    }

    // Fallback: just remove image with no context
    return { ...msg, parts: msg.parts.filter((p) => p.type !== "file") };
  });
}

// ── Message History Compression ──────────────────────────────────────────────
// keepLast=3: compress older history faster → saves ~560 tokens/turn after 3 turns

function optimizeUIHistory(
  messages: UIMessage[],
  keepLast: number = 3
): UIMessage[] {
  // Strip tool output image URLs + old uploaded image parts
  const stripped = stripOldImageParts(stripImagesFromToolOutputs(messages));

  if (stripped.length <= keepLast) return stripped;

  const older = stripped.slice(0, -keepLast);
  const recent = stripped.slice(-keepLast);

  const userTopics = older
    .filter((m) => m.role === "user")
    .map((m) => getUIMessageText(m).slice(0, 40))
    .slice(-3);

  const summary =
    `[Earlier: User asked about: ${userTopics.join("; ")}]`.trim();

  const summaryMessage: UIMessage = {
    id: "summary",
    role: "user",
    parts: [{ type: "text", text: summary }],
  };

  return [summaryMessage, ...recent];
}

// ── Diagnostic helpers ───────────────────────────────────────────────────────

// JSON/structured data tokenizes at ~2.5 chars/token (not 4) — keys, quotes, braces each count
function estTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

/** Serialize tools to readable log (name + description + param names, no execute fn) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTools(tools: Record<string, any>) {
  return Object.entries(tools).map(([name, t]) => ({
    name,
    description: t.description as string,
    params: t.inputSchema?.shape ? Object.keys(t.inputSchema.shape) : [],
  }));
}

/** Summarize message history for logging */
function summarizeMessages(msgs: UIMessage[]) {
  return msgs.map((m) => {
    const text = getUIMessageText(m).slice(0, 80);
    const hasTool = m.parts.some((p) => p.type.startsWith("tool-"));
    const hasFile = m.parts.some((p) => p.type === "file");
    return `  [${m.role}] ${text}${hasTool ? " +tool" : ""}${hasFile ? " +img" : ""}`;
  });
}

// ── Response Cache ────────────────────────────────────────────────────────────
// Exact-match cache for identical browse queries — skips Gemini entirely on hit.
// Only caches stateless intents (no cart, no image, no voice) on fresh sessions.
// Uses body.tee() to capture the live stream bytes and replay them on cache hit.

const RESPONSE_CACHE_INTENTS = new Set([
  "food_search", "category_browse", "popular_browse", "dietary_search", "info",
]);
const RESP_CACHE_TTL = 5 * 60 * 1000; // 5 min — menu data stable within session
const RESP_CACHE_MAX = 50;             // FIFO eviction

// ── Semantic Cache Intent Filter ───────────────────────────────────────────
// Only cache stateless/global intents. Skip user-specific queries (cart, reorder, image).
const SEMANTIC_CACHE_INTENTS = new Set([
  "food_search", "category_browse", "popular_browse", "dietary_search", "info",
]);

interface ResponseCacheEntry {
  chunks: Uint8Array[];
  ts: number;
}
const responseCache = new Map<string, ResponseCacheEntry>();

// ── API Route ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const raw = await req.json();

    // Validate request shape — reject malformed payloads early
    const parseResult = ChatRequestSchema.safeParse(raw);
    if (!parseResult.success) {
      console.warn("[Chat API] Invalid request:", parseResult.error.issues);
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parseResult.error.issues }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { messages, language, weather, cartContext, pendingQueue, isVoiceMode } = raw as {
      messages: UIMessage[];
      language?: Language;
      weather?: WeatherData | null;
      cartContext?: CartContext | null;
      pendingQueue?: PendingQueue | null;
      isVoiceMode?: boolean;
    };

    // ── Rate Limiting ─────────────────────────────────────────────────────────
    // 30 text requests / min / IP — 10 image requests / min / IP
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      ?? req.headers.get("x-real-ip")
      ?? "unknown";

    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    const lastText = lastUserMsg ? getUIMessageText(lastUserMsg) : "";
    const hasImage = lastUserMsg?.parts.some((p) => p.type === "file") ?? false;

    const rlKey = `chat:${clientIp}`;
    const rlLimit = hasImage ? 10 : 30;
    const { allowed } = rateLimit(rlKey, { limit: rlLimit, windowMs: 60_000 });
    if (!allowed) {
      console.warn(`[Chat API] Rate limit hit for ${clientIp}`);
      return new Response(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Non-food / Off-topic Text Guard ───────────────────────────────────────
    // Catches obvious off-topic abuse (code injection, jailbreaks, unrelated topics).
    // The system prompt + Gemini safety settings handle subtler cases.
    const OFF_TOPIC_RE = /\b(ignore (previous|all|prior)|you are now|act as|pretend you|forget your|system prompt|DAN|jailbreak|base64|eval\(|DROP TABLE|rm -rf|sudo |chmod |hack|exploit|malware|ransomware|phishing)\b/i;
    if (OFF_TOPIC_RE.test(lastText) && !hasImage) {
      console.warn(`[Chat API] Off-topic/injection attempt blocked: "${lastText.slice(0, 80)}"`);
      // Stream a polite rejection as a normal assistant message (no error toast, no blank screen)
      const rejectionStream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: "text-start", id: "rejection" });
          writer.write({ type: "text-delta", id: "rejection", delta: "I'm here to help with food orders only! Ask me about our menu, recommendations, or your cart. 🍽️" });
          writer.write({ type: "text-end", id: "rejection" });
        },
      });
      return createUIMessageStreamResponse({ stream: rejectionStream });
    }

    // ── Image Safety Pre-check ─────────────────────────────────────────────────
    // Gemini safety settings block NSFW content at model level.
    // Additional guard: reject non-base64 / suspicious file payloads early.
    if (hasImage) {
      const imgPart = lastUserMsg?.parts.find((p) => p.type === "file") as
        | { type: "file"; mediaType: string; url: string }
        | undefined;

      if (imgPart) {
        // Only accept image/* MIME types
        if (!imgPart.mediaType?.startsWith("image/")) {
          console.warn(`[Chat API] Non-image file rejected: ${imgPart.mediaType}`);
          return new Response(
            JSON.stringify({ error: "Only image files are supported." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        // Sanity check on URL — must be data URL (base64) or https URL
        if (!imgPart.url?.startsWith("data:") && !imgPart.url?.startsWith("https://")) {
          console.warn(`[Chat API] Suspicious image URL scheme rejected`);
          return new Response(
            JSON.stringify({ error: "Invalid image format." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Detect intent from last user message (lastUserMsg, lastText, hasImage already declared above)
    const intent = detectIntent(lastText, hasImage);

    // ── Early history computation (needed for cache key + pristine check) ────
    const filtered = messages.filter((m) => m.id !== "welcome");
    const optimizedMessages = optimizeUIHistory(filtered);

    // ── Response cache check ──────────────────────────────────────────────────
    // Only cache: non-image, non-voice, stateless browse intents, FRESH sessions.
    // "Fresh session" = only the current message exists (no prior conversation).
    // Different users asking the same first question share the cache (menu is global).
    const isPristineSession = filtered.length === 1; // only the current user message
    const canCache = !hasImage && !isVoiceMode && isPristineSession && RESPONSE_CACHE_INTENTS.has(intent);
    const normalizedMsg = lastText.toLowerCase().trim().replace(/\s+/g, " ");
    const cacheKey = `${normalizedMsg}:${intent}:${language || "en"}`;

    if (canCache) {
      const hit = responseCache.get(cacheKey);
      if (hit && Date.now() - hit.ts < RESP_CACHE_TTL) {
        console.log(`[Chat] ⚡ RESPONSE CACHE HIT → "${cacheKey.slice(0, 60)}" (0 Gemini tokens)`);
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of hit.chunks) controller.enqueue(chunk);
            controller.close();
          },
        });
        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "x-vercel-ai-data-stream": "v1",
            "X-Cache-Status": "HIT",
          },
        });
      }
    }

    // ── Semantic Input Cache Check ───────────────────────────────────────────
    // Prevents duplicate Gemini calls for identical stateless queries within session TTL.
    // Only caches: food_search, category_browse, popular_browse, dietary_search, info.
    // Skips user-specific: cart_action, reorder, direct_order, image.
    const canSemanticCache = SEMANTIC_CACHE_INTENTS.has(intent);
    const normalizedQuery = lastText.toLowerCase().trim().replace(/\s+/g, " ");
    const semanticCacheKey = SemanticInputCache.generateKey(normalizedQuery, "global");
    const semanticCacheHit = canSemanticCache ? semanticCache.get(semanticCacheKey) : null;
    console.log(`[Cache] intent=${intent} cacheable=${canSemanticCache} hit=${!!semanticCacheHit}`);

    if (semanticCacheHit) {
      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of semanticCacheHit.cachedChunks) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "x-vercel-ai-data-stream": "v1",
          "X-Cache-Status": "SEMANTIC-HIT",
        },
      });
    }

    // ── Normal flow ──────────────────────────────────────────────────────────

    // Get only relevant tools for this intent
    const allTools = createRAGTools();
    const tools = getToolsForIntent(intent, allTools);

    const systemPrompt = await buildSystemPrompt(language || "en", weather, cartContext, pendingQueue, undefined, hasImage, isVoiceMode, intent);
    const modelMessages = await convertToModelMessages(optimizedMessages);

    // ── Diagnostic log ───────────────────────────────────────────────────────
    const toolList = serializeTools(tools);
    const sysPTokens = estTokens(systemPrompt);
    const msgTokens = estTokens(JSON.stringify(modelMessages));
    const toolSchemaTokens = estTokens(JSON.stringify(toolList));

    console.log("════════════════════════════════════════════");
    console.log(`[Chat] intent:${intent} | voice:${!!isVoiceMode} | hasImage:${hasImage} | cache:${canCache ? "eligible" : "skip"}`);
    console.log(`[Msgs] raw:${messages.length} → optimized:${optimizedMessages.length}`);
    summarizeMessages(optimizedMessages).forEach((l) => console.log(l));
    console.log(`[SystemPrompt] ~${sysPTokens} tokens (${systemPrompt.length} chars)`);
    console.log(`  └─ ${systemPrompt.slice(0, 200).replace(/\n/g, " | ")}…`);
    console.log(`[Tools→Gemini] count:${toolList.length} | ~${toolSchemaTokens} tokens`);
    toolList.forEach((t) =>
      console.log(`  ├─ ${t.name}: "${t.description}" | params:[${t.params.join(", ")}]`)
    );
    console.log(`[History] ~${msgTokens} tokens`);
    console.log(`[Est.Input] sys:${sysPTokens} + msgs:${msgTokens} + tools:${toolSchemaTokens} = ~${sysPTokens + msgTokens + toolSchemaTokens} tokens (×2 steps)`);
    console.log("════════════════════════════════════════════");

    let inputTokens = 0, outputTokens = 0, toolCallCount = 0;

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: isVoiceMode ? 200 : 512,
      temperature: 0.7,
      stopWhen: stepCountIs(3),
      tools,
      // ── Gemini-level safety: block NSFW at model layer (no extra API key needed) ──
      // BLOCK_LOW_AND_ABOVE = strictest — blocks anything detected at low confidence or above.
      // This prevents explicit content from reaching users even in image analysis mode.
      providerOptions: {
        google: {
          safetySettings: [
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
          ],
        },
      },
      onStepFinish({ usage, toolCalls }) {
        inputTokens += usage?.inputTokens ?? 0;
        outputTokens += usage?.outputTokens ?? 0;
        toolCallCount += (toolCalls?.length ?? 0);
      },
    });

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        writer.merge(result.toUIMessageStream());
        await result.usage;
        console.log(`[Tokens] ACTUAL → input:${inputTokens} output:${outputTokens} total:${inputTokens + outputTokens} | est.input was:~${sysPTokens + msgTokens + toolSchemaTokens} | toolCalls:${toolCallCount}`);
        console.log(`[UIBadge] will show → input:${inputTokens} output:${outputTokens} total:${inputTokens + outputTokens}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writer as any).write({
          type: "data-token-usage",
          id: "token-usage",
          data: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, toolCalls: toolCallCount },
        });
      },
      onError: (error) => {
        console.error("[Chat stream] Error:", error);
        return "Sorry, something went wrong. Please try again.";
      },
    });

    const streamResponse = createUIMessageStreamResponse({ stream });

    // ── Cache capture via body.tee() ──────────────────────────────────────────
    // Single tee captures chunks for both response cache + semantic cache.
    // Client gets their stream immediately; caches fill in background.
    const needsCapture = (canCache || true) && streamResponse.body;
    if (needsCapture && streamResponse.body) {
      const [forClient, forCapture] = streamResponse.body.tee();

      (async () => {
        const reader = forCapture.getReader();
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }

          if (chunks.length > 0) {
            // Response cache (pristine browse sessions)
            if (canCache) {
              if (responseCache.size >= RESP_CACHE_MAX) {
                const firstKey = responseCache.keys().next().value;
                if (firstKey) responseCache.delete(firstKey);
              }
              responseCache.set(cacheKey, { chunks, ts: Date.now() });
              console.log(`[Chat] ✅ RESP CACHED → "${cacheKey.slice(0, 60)}" (${chunks.length} chunks)`);
            }

            // Semantic input cache (dedup identical stateless queries)
            if (canSemanticCache) {
              semanticCache.set(semanticCacheKey, {
                cachedChunks: chunks,
                tokenUsage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
                cachedAt: Date.now(),
              });
              console.log(`[Cache] Stored: key=${semanticCacheKey.slice(0,12)}... tokens=${inputTokens + outputTokens}`);
            }
          }
        } catch {
          // Fail silently — cache miss on next request is fine
        }
      })();

      return new Response(forClient, {
        status: streamResponse.status,
        headers: streamResponse.headers,
      });
    }

    return streamResponse;
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
