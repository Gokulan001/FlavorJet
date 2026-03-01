import { streamText, convertToModelMessages, tool, stepCountIs } from "ai";
import type { UIMessage, ModelMessage } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/providers";
import { buildSystemPrompt, type Language, type WeatherData } from "@/lib/ai/system-prompt";
import { searchMenu, getCategoryItems, getItemDetails, getPopularItems } from "@/lib/ai/menu-context";

// ── Helpers ─────────────────────────────────────────────────────────────────
// Extract text content from a UIMessage's parts array
function getUIMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// ── Message History Compression ──────────────────────────────────────────────
// Keeps last N messages, compresses older ones into a summary line.
// Saves ~200-500 tokens per request on long conversations.

function optimizeUIHistory(
  messages: UIMessage[],
  keepLast: number = 8
): UIMessage[] {
  if (messages.length <= keepLast) return messages;

  const older = messages.slice(0, -keepLast);
  const recent = messages.slice(-keepLast);

  // Compress older messages into a brief summary
  const orderMentions: string[] = [];
  for (const msg of older) {
    const text = getUIMessageText(msg);
    if (msg.role === "assistant" && text.includes("ITEMS:")) {
      const match = text.match(/ITEMS:([^\n]+)/);
      if (match) orderMentions.push(`Previous order: ${match[1]}`);
    }
  }

  const userTopics = older
    .filter((m) => m.role === "user")
    .map((m) => getUIMessageText(m).slice(0, 40))
    .slice(-3);

  const summary =
    `[Earlier in conversation: User discussed: ${userTopics.join("; ")}. ${orderMentions.join(". ")}]`.trim();

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
    const { messages, language, weather } = body as {
      messages: UIMessage[];
      language?: Language;
      weather?: WeatherData | null;
    };

    const systemPrompt = buildSystemPrompt(language || "en", weather);
    const optimizedMessages = optimizeUIHistory(messages);

    // Convert UIMessages → ModelMessages for streamText
    const modelMessages = await convertToModelMessages(optimizedMessages);

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: modelMessages,
      maxOutputTokens: 1024,
      temperature: 0.7,
      stopWhen: stepCountIs(5), // Allow up to 5 tool call steps

      tools: {
        search_menu: tool({
          description:
            "Search the restaurant menu for items matching a keyword. Use this when user asks about specific food, mentions a dish name, or wants recommendations.",
          inputSchema: z.object({
            query: z.string().describe("Food name or keyword to search, e.g. 'burger', 'spicy', 'salad'"),
          }),
          execute: async ({ query }) => {
            const results = searchMenu(query);
            if (results.length === 0) return { found: false, message: "No items match that search." };
            return { found: true, items: results };
          },
        }),

        get_category_items: tool({
          description:
            "Get all available items in a menu category. Use when user asks to see a category like 'show me burgers' or 'what pizzas do you have'.",
          inputSchema: z.object({
            category: z.string().describe("Category name, e.g. 'Burgers', 'Pizza', 'Desserts'"),
          }),
          execute: async ({ category }) => {
            const items = getCategoryItems(category);
            if (items.length === 0) return { found: false, message: `No items found in "${category}" category.` };
            return { found: true, items };
          },
        }),

        get_item_details: tool({
          description:
            "Get full details of a specific menu item including modifiers/customization options. Use when user wants details about a specific item or you need to check if it has modifiers before ordering.",
          inputSchema: z.object({
            itemId: z.number().describe("The numeric ID of the menu item"),
          }),
          execute: async ({ itemId }) => {
            const item = getItemDetails(itemId);
            if (!item) return { found: false, message: "Item not found." };
            return { found: true, item };
          },
        }),

        get_popular_items: tool({
          description:
            "Get the most popular/highest-rated items across all categories. Use when user asks for recommendations, 'what's good', or 'best sellers'.",
          inputSchema: z.object({}),
          execute: async () => {
            const items = getPopularItems();
            return { items };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[Chat API] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
