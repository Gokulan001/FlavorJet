"use client";

import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import type { UIMessage } from "ai";
import { getMessageText, cleanMarkers } from "./types";
import MenuItemCard, { type MenuItemData } from "./MenuItemCard";

interface MessageBubbleProps {
  message: UIMessage;
  index: number;
  onQuickAdd?: (itemId: number) => void;
  onViewDetails?: (url: string) => void;
}

// ── Extract structured menu items from tool result parts ─────────────────────
// AI SDK v6 tool parts have type `tool-${toolName}` with state/input/output fields
function extractMenuItems(message: UIMessage): MenuItemData[] {
  const items: MenuItemData[] = [];
  const seenIds = new Set<number>();

  for (const part of message.parts) {
    // Tool parts have type starting with "tool-"
    if (!part.type.startsWith("tool-")) continue;

    // Cast through unknown to access the SDK's tool part shape
    const toolPart = part as unknown as {
      type: string;
      state: string;
      output?: unknown;
    };

    // Only process completed tool calls with output
    if (toolPart.state !== "result" || !toolPart.output) continue;

    const result = toolPart.output as Record<string, unknown>;

    // Handle tools that return { items: [...] } — search_menu, get_category_items, get_popular_items
    if (result.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        if (item && typeof item === "object" && "id" in item && !seenIds.has(item.id as number)) {
          seenIds.add(item.id as number);
          items.push(item as MenuItemData);
        }
      }
    }

    // Handle get_item_details which returns { item: {...} }
    if (
      result.item &&
      typeof result.item === "object" &&
      "id" in (result.item as Record<string, unknown>) &&
      !seenIds.has((result.item as { id: number }).id)
    ) {
      seenIds.add((result.item as { id: number }).id);
      items.push(result.item as MenuItemData);
    }
  }

  return items;
}

// ── Simple markdown-like formatting ──────────────────────────────────────────
function FormatText({ text }: { text: string }) {
  // Split by lines, handle **bold** and bullet points
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        // Bold text: **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) => {
          if (p.startsWith("**") && p.endsWith("**")) {
            return (
              <span key={j} className="font-semibold text-[#0f172b] dark:text-white">
                {p.slice(2, -2)}
              </span>
            );
          }
          return <span key={j}>{p}</span>;
        });

        return (
          <span key={i}>
            {rendered}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

export default function MessageBubble({
  message,
  index,
  onQuickAdd,
  onViewDetails,
}: MessageBubbleProps) {
  const text = getMessageText(message);
  const isUser = message.role === "user";
  const displayText = isUser ? text : cleanMarkers(text);
  const menuItems = !isUser ? extractMenuItems(message) : [];

  // Don't render empty messages (but allow messages with only cards)
  if (!displayText && menuItems.length === 0) return null;

  // Check if streaming (last text part has state === 'streaming')
  const lastTextPart = [...message.parts]
    .reverse()
    .find((p) => p.type === "text");
  const isStreaming =
    lastTextPart &&
    "state" in lastTextPart &&
    lastTextPart.state === "streaming";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
        delay: Math.min(index * 0.05, 0.15),
      }}
      className={`flex ${isUser ? "justify-end" : "justify-start gap-2"}`}
    >
      {/* ── Bot Avatar ──────────────────────────────────────────────────────── */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#fea116] to-[#e89000] flex items-center justify-center shadow-sm shadow-[#fea116]/20 ring-2 ring-[#fea116]/10">
            <Bot className="w-3.5 h-3.5 text-[#0f172b]" />
          </div>
        </div>
      )}

      <div className={`${isUser ? "max-w-[80%]" : "max-w-[85%]"} space-y-2`}>
        {/* ── Text Bubble ─────────────────────────────────────────────────── */}
        {displayText && (
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-gradient-to-br from-[#fea116] to-[#e89000] text-[#0f172b] rounded-2xl rounded-br-md shadow-sm shadow-[#fea116]/20"
                : "bg-white dark:bg-slate-800/80 text-[#0f172b] dark:text-slate-200 rounded-2xl rounded-tl-md border border-[#fea116]/10 dark:border-slate-700/30 shadow-sm"
            }`}
          >
            {isUser ? displayText : <FormatText text={displayText} />}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#fea116] animate-pulse rounded-full align-text-bottom opacity-60" />
            )}
          </div>
        )}

        {/* ── Menu Item Cards (horizontal scroll) ────────────────────────── */}
        {menuItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide -mx-1 px-1"
          >
            {menuItems.slice(0, 8).map((item, i) => (
              <MenuItemCard
                key={item.id}
                item={item}
                index={i}
                onQuickAdd={onQuickAdd}
                onViewDetails={onViewDetails}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
