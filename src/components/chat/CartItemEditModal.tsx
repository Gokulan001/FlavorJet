"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, Trash2, Check } from "lucide-react";
import Image from "next/image";
import { updateCartQuantity, updateSpecialInstructions, removeFromCart } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import type { FullCartItem } from "./types";

interface CartItemEditModalProps {
  item: FullCartItem | null;
  onClose: () => void;
  onRefreshCart: () => void;
}

export default function CartItemEditModal({ item, onClose, onRefreshCart }: CartItemEditModalProps) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setQty(item.quantity);
      setNote(item.specialInstructions ?? "");
    }
  }, [item]);

  if (!item) return null;

  const handleDone = async () => {
    setSaving(true);
    try {
      if (qty !== item.quantity) {
        await updateCartQuantity(item.id, qty);
      }
      const newNote = note.trim();
      const currentNote = item.specialInstructions?.trim() ?? "";
      if (newNote !== currentNote) {
        await updateSpecialInstructions(item.id, newNote);
      }
      onRefreshCart();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await removeFromCart(item.id);
      onRefreshCart();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[calc(100vw-2rem)] max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              {item.itemImage && (
                <div className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                  <Image
                    src={item.itemImage}
                    alt={item.itemName}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {item.itemName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatPrice(item.unitPrice)} each</p>
              </div>
              <button
                aria-label="Close"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* Qty stepper */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Quantity
                </label>
                <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 rounded-xl p-3 w-fit">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQty((q) => Math.max(0, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-semibold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center text-lg font-bold text-slate-900 dark:text-white">
                    {qty}
                  </span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modifiers (read-only) */}
              {item.modifiers.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Modifiers
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {item.modifiers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fea116]/15 text-xs font-medium text-[#fea116] border border-[#fea116]/30 dark:text-[#fea116]"
                      >
                        {m.name}
                        {m.priceAdjustment > 0 && (
                          <span className="text-[10px] opacity-75 font-semibold">+{formatPrice(m.priceAdjustment)}</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                    To change modifiers, remove and re-order from chat.
                  </p>
                </div>
              )}

              {/* Special instructions */}
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                  Special instructions
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="E.g. extra napkins, no onions, extra spicy..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-6 py-5 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleRemove}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
              <button
                onClick={handleDone}
                disabled={saving || qty === 0}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#fea116] to-[#e89000] text-sm font-bold text-slate-900 hover:shadow-lg hover:shadow-[#fea116]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-900 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Done
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
