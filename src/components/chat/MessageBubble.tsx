"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, ExternalLink, ChevronRight } from "lucide-react";
import Image from "next/image";
import type { UIMessage } from "ai";
import { getMessageText } from "./types";
import type { MinimalMenuItem } from "./types";
import MenuItemCard from "./MenuItemCard";

interface MessageBubbleProps {
  message: UIMessage;
  index: number;
  onAddToCart?: (slug: string) => void;
  onCustomize?: (slug: string) => void;
  userProfilePicture?: string | null;
}

// ── Extract MinimalMenuItem[] from tool-result parts ────────────────────────
// Two-pass algorithm:
// Pass 1: collect slugs of items successfully added to cart (from tool-add_to_cart)
// Pass 2: collect items from all other tools, excluding already-added slugs
// This prevents added items from appearing as browsing cards.

function extractMenuItems(message: UIMessage): MinimalMenuItem[] {
  const addedSlugs = new Set<string>();
  const seenSlugs = new Set<string>();
  const items: MinimalMenuItem[] = [];

  // Pass 1: collect addedSlugs from successful add_to_cart results
  for (const part of message.parts) {
    if (part.type !== "tool-add_to_cart") continue;
    const toolPart = part as unknown as { state: string; output?: unknown };
    if (toolPart.state !== "output-available" || !toolPart.output) continue;
    const result = toolPart.output as Record<string, unknown>;
    if (result.addedSlugs && Array.isArray(result.addedSlugs)) {
      for (const slug of result.addedSlugs as string[]) addedSlugs.add(slug);
    }
  }

  // Pass 2: collect items from all item-returning tools, excluding added slugs
  for (const part of message.parts) {
    if (!part.type.startsWith("tool-") || part.type === "tool-add_to_cart") continue;

    const toolPart = part as unknown as { type: string; state: string; output?: unknown };
    if (toolPart.state !== "output-available" || !toolPart.output) continue;
    const result = toolPart.output as Record<string, unknown>;

    if (result.items && Array.isArray(result.items)) {
      for (const item of result.items) {
        if (item && typeof item === "object" && "slug" in item && "name" in item) {
          const slug = (item as { slug: string }).slug;
          if (!seenSlugs.has(slug) && !addedSlugs.has(slug)) {
            seenSlugs.add(slug);
            items.push(item as MinimalMenuItem);
          }
        }
      }
    }
  }

  return items;
}

// ── Parse line segments into bold, URLs, plain text ─────────────────────────

function parseSegments(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);

  return parts.map((p, j) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <span key={j} className="font-semibold text-slate-900 dark:text-white">
          {p.slice(2, -2)}
        </span>
      );
    }
    if (/^https?:\/\//.test(p)) {
      const display = p.replace(/^https?:\/\//, "").slice(0, 30);
      return (
        <a
          key={j}
          href={p}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#fea116]/10 text-[#fea116] rounded-full text-xs font-medium hover:bg-[#fea116]/20 transition-colors"
        >
          {display}
          <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    return <span key={j}>{p}</span>;
  });
}

// ── Enhanced text formatting ────────────────────────────────────────────────

function FormatText({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trimStart();

        if (/^[-*]\s/.test(trimmed)) {
          const content = trimmed.replace(/^[-*]\s/, "");
          return (
            <div key={i} className="flex gap-1.5 ml-1 my-0.5">
              <span className="text-[#fea116] mt-0.5">-</span>
              <span>{parseSegments(content)}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5 ml-1 my-0.5">
              <span className="text-[#fea116] font-semibold min-w-[1rem]">{numMatch[1]}.</span>
              <span>{parseSegments(numMatch[2])}</span>
            </div>
          );
        }

        return (
          <span key={i}>
            {parseSegments(line)}
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}

// ── Extract uploaded image parts from a user message ─────────────────────────

function extractUserImages(message: UIMessage): string[] {
  return message.parts
    .filter((p): p is { type: "file"; mediaType: string; url: string } => p.type === "file")
    .map((p) => p.url);
}

export default function MessageBubble({
  message,
  index,
  onAddToCart,
  onCustomize,
  userProfilePicture,
}: MessageBubbleProps) {
  const text = getMessageText(message);
  const isUser = message.role === "user";
  const menuItems = !isUser ? extractMenuItems(message) : [];
  const userImages = isUser ? extractUserImages(message) : [];

  const [isScrollable, setIsScrollable] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScroll = () => {
      if (carouselRef.current) {
        const { scrollWidth, clientWidth } = carouselRef.current;
        setIsScrollable(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [menuItems.length]);

  if (!text && menuItems.length === 0 && userImages.length === 0) return null;

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
      className={`flex ${isUser ? "justify-end gap-2" : "justify-start gap-2"}`}
    >
      {/* Bot Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <Image
            src="/ai-avatar.png"
            alt="FlavorJet AI"
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover shadow-sm shadow-[#fea116]/20 ring-2 ring-[#fea116]/10"
          />
        </div>
      )}

      <div className={`${isUser ? "max-w-[80%]" : "max-w-[85%]"} space-y-2`}>
        {/* Uploaded Image(s) — shown above text for user messages */}
        {userImages.length > 0 && (
          <div className="flex gap-2 justify-end flex-wrap">
            {userImages.map((url, i) => (
              <div
                key={i}
                className="rounded-2xl rounded-br-md overflow-hidden border-2 border-[#fea116]/30 shadow-sm shadow-[#fea116]/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Uploaded"
                  className="h-36 w-auto max-w-[220px] object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {/* Text Bubble */}
        {(text || (menuItems.length > 0 && !isUser)) && (
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
              isUser
                ? "bg-gradient-to-br from-[#fea116] to-[#e89000] text-slate-900 rounded-2xl rounded-br-md shadow-sm shadow-[#fea116]/20"
                : "bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-200 rounded-2xl rounded-tl-md border border-[#fea116]/10 dark:border-slate-700/30 shadow-sm"
            }`}
          >
            {isUser ? text : <FormatText text={text || "Check out these options:"} />}
            {isStreaming && (
              <span data-testid="streaming-cursor" className="inline-block w-1.5 h-4 ml-0.5 bg-[#fea116] animate-pulse rounded-full align-text-bottom opacity-60" />
            )}
          </div>
        )}

        {/* Menu Item Cards */}
        {menuItems.length > 0 && (
          <div className="relative">
            <motion.div
              ref={carouselRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide -mx-1 px-1"
            >
              {menuItems.slice(0, 8).map((item, i) => (
                <MenuItemCard
                  key={item.slug}
                  item={item}
                  index={i}
                  onAddToCart={onAddToCart}
                  onCustomize={onCustomize}
                />
              ))}
            </motion.div>

            {/* Scroll indicator */}
            {isScrollable && (
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                <div className="flex items-center gap-1 pr-1">
                  <ChevronRight className="w-4 h-4 text-[#fea116] opacity-70" />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          {userProfilePicture ? (
            <Image
              src={userProfilePicture}
              alt="You"
              width={28}
              height={28}
              className="w-7 h-7 rounded-full object-cover border-2 border-[#fea116]/30"
            />
          ) : (
            <div data-testid="user-icon-fallback" className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
