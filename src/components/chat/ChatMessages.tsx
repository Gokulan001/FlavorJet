"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { UIMessage } from "ai";
import MessageBubble from "./MessageBubble";
import SuggestionChips from "./SuggestionChips";
import OrderConfirmCard from "./OrderConfirmCard";
import ModifierPicker from "./ModifierPicker";
import type { OrderItem, PendingModifiers } from "./types";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
  suggestions: string[];
  onSuggestionSelect: (text: string) => void;
  pendingOrder: OrderItem[] | null;
  onConfirmOrder: () => void;
  onCancelOrder: () => void;
  addingToCart: boolean;
  pendingModifiers: PendingModifiers | null;
  onModifierSelect: (groupName: string, modifierIds: number[]) => void;
  onModifierConfirm: () => void;
  onModifierCancel: () => void;
  onQuickAdd?: (itemId: number) => void;
  onViewDetails?: (url: string) => void;
}

export default function ChatMessages({
  messages, isLoading, suggestions, onSuggestionSelect,
  pendingOrder, onConfirmOrder, onCancelOrder, addingToCart,
  pendingModifiers, onModifierSelect, onModifierConfirm, onModifierCancel,
  onQuickAdd, onViewDetails,
}: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, pendingOrder, pendingModifiers]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide bg-gradient-to-b from-white to-[#fef9f0] dark:from-[#0f172b] dark:to-[#0f172b]">
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          index={i}
          onQuickAdd={onQuickAdd}
          onViewDetails={onViewDetails}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-start gap-2"
        >
          {/* Bot avatar for loading */}
          <div className="flex-shrink-0 mt-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#fea116] to-[#e89000] flex items-center justify-center shadow-sm shadow-[#fea116]/20 ring-2 ring-[#fea116]/10">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-[#0f172b] border-t-transparent animate-spin" />
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

      {/* Modifier Picker */}
      {pendingModifiers && !isLoading && (
        <ModifierPicker
          modifiers={pendingModifiers}
          onSelect={onModifierSelect}
          onConfirm={onModifierConfirm}
          onCancel={onModifierCancel}
        />
      )}

      {/* Order Confirm Card */}
      {pendingOrder && !isLoading && !pendingModifiers && (
        <OrderConfirmCard
          items={pendingOrder}
          onConfirm={onConfirmOrder}
          onCancel={onCancelOrder}
          adding={addingToCart}
        />
      )}

      {/* Suggestion Chips */}
      {!isLoading && suggestions.length > 0 && !pendingOrder && !pendingModifiers && (
        <div className="pt-1">
          <SuggestionChips suggestions={suggestions} onSelect={onSuggestionSelect} />
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
