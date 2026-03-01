"use client";

import { motion } from "framer-motion";
import { ShoppingCart, Loader2 } from "lucide-react";
import type { OrderItem } from "./types";

interface OrderConfirmCardProps {
  items: OrderItem[];
  onConfirm: () => void;
  onCancel: () => void;
  adding: boolean;
}

export default function OrderConfirmCard({ items, onConfirm, onCancel, adding }: OrderConfirmCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex justify-start"
    >
      <div className="bg-gradient-to-br from-[#fea116]/10 to-[#fea116]/5 border border-[#fea116]/20 rounded-2xl p-4 space-y-3 w-full max-w-[85%]">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-[#fea116]" />
          <p className="text-sm font-semibold text-[#0f172b] dark:text-white">
            Ready to add to cart?
          </p>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {items.length} item{items.length > 1 ? "s" : ""} • Tap confirm to add
        </p>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={adding}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#fea116] to-[#e89000] text-[#0f172b] rounded-xl text-sm font-bold hover:shadow-md hover:shadow-[#fea116]/20 transition-all disabled:opacity-60"
          >
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingCart className="w-4 h-4" />
            )}
            {adding ? "Adding..." : "Add to Cart"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}
