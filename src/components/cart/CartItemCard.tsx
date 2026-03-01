"use client";

import { useTransition, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, Loader2, MessageSquare, Pencil } from "lucide-react";
import { updateCartQuantity, removeFromCart, updateSpecialInstructions } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";

interface CartItemModifier {
  id: number;
  name: string;
  priceAdjustment: number;
  groupName: string;
}

interface CartItemCardProps {
  item: {
    id: number;
    quantity: number;
    specialInstructions: string | null;
    menuItemId: number;
    itemName: string;
    itemSlug: string;
    itemPrice: number;
    itemImage: string;
    categoryId: number;
    categorySlug: string;
    modifiers: CartItemModifier[];
    unitPrice: number;
    lineTotal: number;
  };
}

export default function CartItemCard({ item }: CartItemCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(!!item.specialInstructions);
  const [notes, setNotes] = useState(item.specialInstructions || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleUpdateQuantity = (newQuantity: number) => {
    startTransition(async () => {
      await updateCartQuantity(item.id, newQuantity);
    });
  };

  const handleRemove = () => {
    startTransition(async () => {
      await removeFromCart(item.id);
    });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await updateSpecialInstructions(item.id, value);
      });
    }, 800);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {isPending && (
        <div className="absolute inset-0 bg-white/60 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center z-10">
          <Loader2 className="w-6 h-6 animate-spin text-[#fea116]" />
        </div>
      )}

      <div className="flex gap-3 sm:gap-4 p-3 sm:p-4">
        {/* Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden">
          <Image
            src={item.itemImage}
            alt={item.itemName}
            fill
            className="object-cover"
            sizes="96px"
          />
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-[#0f172b] dark:text-white line-clamp-1">
                {item.itemName}
              </h3>
              {item.modifiers.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  {item.modifiers.map((mod) => (
                    <p key={mod.id} className="text-xs text-gray-500 dark:text-slate-400">
                      {mod.groupName}: {mod.name}
                      {mod.priceAdjustment > 0 && (
                        <span className="text-[#fea116] ml-1">
                          +{formatPrice(mod.priceAdjustment)}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {item.modifiers.length > 0 && (
                <Link
                  href={`/menu/${item.categorySlug}/${item.itemSlug}?edit=${item.id}&qty=${item.quantity}&mods=${item.modifiers.map(m => m.id).join(",")}`}
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-[#fea116] hover:bg-[#fea116]/10 rounded-lg transition-colors"
                  title="Edit item"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={handleRemove}
                className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-slate-700 rounded-xl px-1 py-0.5">
              <button
                onClick={() => handleUpdateQuantity(item.quantity - 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-[#0f172b] dark:text-white"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-semibold text-sm text-[#0f172b] dark:text-white">
                {item.quantity}
              </span>
              <button
                onClick={() => handleUpdateQuantity(item.quantity + 1)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-[#0f172b] dark:text-white"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="font-bold text-[#fea116] text-lg">
              {formatPrice(item.lineTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Special Instructions */}
      <div className="border-t border-gray-50 dark:border-slate-700 px-3 sm:px-4">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1.5 py-2 text-xs text-gray-500 dark:text-slate-400 hover:text-[#fea116] transition-colors w-full"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {showNotes ? "Hide" : "Add"} special instructions
          {notes && !showNotes && (
            <span className="text-[#fea116] ml-1 italic truncate max-w-[200px]">
              &mdash; &ldquo;{notes}&rdquo;
            </span>
          )}
        </button>

        {showNotes && (
          <div className="pb-3">
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="e.g., No onions, extra sauce, allergy notes..."
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-600 rounded-xl resize-none bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
