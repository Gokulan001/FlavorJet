"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  suggestions: string[];
  onSuggestionSelect: (text: string) => void;
  onAddToCart?: (slug: string) => void;
  onCustomize?: (slug: string) => void;
  userProfilePicture?: string | null;
}

export default function ChatMessages({
  messages,
  isLoading,
  suggestions,
  onSuggestionSelect,
  onAddToCart,
  onCustomize,
  userProfilePicture,
}: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Only scroll chat container internally when new message arrives, not page
  useEffect(() => {
    if (containerRef.current && endRef.current) {
      // Get container bounds
      const container = containerRef.current;
      const end = endRef.current;
      const containerBottom = container.scrollHeight - container.clientHeight;

      // Only auto-scroll if content overflows AND we're near the bottom (within 100px)
      if (container.scrollTop > containerBottom - 100) {
        end.scrollIntoView({ behavior: "auto", block: "nearest" });
      }
    }
  }, [messages, isLoading]);

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
      {messages.map((msg, i) => (
        <MessageBubble
          key={`${msg.id}-${i}`}
          message={msg}
          index={i}
          onAddToCart={onAddToCart}
          onCustomize={onCustomize}
          userProfilePicture={userProfilePicture}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          role="status"
          aria-label="AI is typing"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start gap-2"
        >
          <div className="flex-shrink-0 mt-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#fea116] to-[#e89000] flex items-center justify-center shadow-sm shadow-[#fea116]/20 ring-2 ring-[#fea116]/10">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/80 px-4 py-3 rounded-2xl rounded-tl-md border border-[#fea116]/10 dark:border-slate-700/30 shadow-sm">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 bg-[#fea116] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#fea116] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#fea116] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Suggestion Chips */}
      {!isLoading && suggestions.length > 0 && (
        <div className="pt-1">
          <SuggestionChips suggestions={suggestions} onSelect={onSuggestionSelect} />
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
