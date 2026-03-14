import { streamText, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { getModel } from "@/lib/ai/providers";
import { buildSystemPrompt, type Language, type WeatherData } from "@/lib/ai/system-prompt";
import { createRAGTools } from "@/lib/rag/tools";
import { detectIntent, getToolsForIntent } from "@/lib/ai/intent-router";
import type { CartContext, PendingQueue } from "@/components/chat/types";

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

function optimizeUIHistory(
  messages: UIMessage[],
  keepLast: number = 5
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

// ── API Route ────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, language, weather, cartContext, pendingQueue, isVoiceMode } = body as {
      messages: UIMessage[];
      language?: Language;
      weather?: WeatherData | null;
      cartContext?: CartContext | null;
      pendingQueue?: PendingQueue | null;
      isVoiceMode?: boolean;
    };

    // Detect intent from last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    const lastText = lastUserMsg ? getUIMessageText(lastUserMsg) : "";
    const hasImage = lastUserMsg?.parts.some((p) => p.type === "file") ?? false;
    const intent = detectIntent(lastText, hasImage);

    // Get only relevant tools for this intent
    const allTools = createRAGTools();
    const tools = getToolsForIntent(intent, allTools);

    const toolCount = Object.keys(tools).length;
    console.log(`[Chat] intent:${intent} hasImage:${hasImage} tools:${toolCount} msgs:${messages.length}`);

    const systemPrompt = await buildSystemPrompt(language || "en", weather, cartContext, pendingQueue, undefined, hasImage, isVoiceMode);
    const filtered = messages.filter((m) => m.id !== "welcome");
    const optimizedMessages = optimizeUIHistory(filtered);
    const modelMessages = await convertToModelMessages(optimizedMessages);

    let inputTokens = 0, outputTokens = 0, toolCallCount = 0;

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: isVoiceMode ? 200 : 512,
      temperature: 0.7,
      stopWhen: stepCountIs(5),
      tools,
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (writer as any).write({
          type: "data-token-usage",
          id: "token-usage",
          data: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, toolCalls: toolCallCount },
        });
      },
      onError: () => "An error occurred",
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
