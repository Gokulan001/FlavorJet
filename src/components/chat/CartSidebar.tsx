"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Pencil, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { CartContext, FullCartItem } from "./types";

interface CartSidebarProps {
  cart: CartContext | null;
  fullItems: FullCartItem[];
  onCheckout: () => void;
  onEditItem: (item: FullCartItem) => void;
}

function CartItemCard({
  item,
  onEdit,
}: {
  item: FullCartItem;
  onEdit: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative flex items-center gap-3 p-3 rounded-2xl
        bg-white/70 dark:bg-slate-800/50 backdrop-blur-sm
        border border-white/60 dark:border-slate-700/30
        hover:bg-white/90 dark:hover:bg-slate-800/70
        hover:shadow-lg hover:shadow-[#fea116]/8
        hover:-translate-y-0.5
        transition-all duration-200 cursor-pointer"
      onClick={onEdit}
    >
      {/* Thumbnail */}
      <div className="relative h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-[#fea116]/10 to-[#fea116]/5 shadow-sm">
        {item.itemImage ? (
          <Image
            src={item.itemImage}
            alt={item.itemName}
            fill
            className="object-cover"
            sizes="56px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl">🍽️</div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-white leading-tight">
              {item.itemName}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Qty: {item.quantity}
            </p>
          </div>
          <span className="text-xs font-bold text-[#fea116] flex-shrink-0">
            {formatPrice(item.lineTotal)}
          </span>
        </div>

        {/* Modifier pills */}
        {item.modifiers.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {item.modifiers.map((m) => (
              <span
                key={m.id}
                className="inline-block px-1.5 py-0.5 text-[9px] font-medium bg-[#fea116]/10 text-[#fea116] rounded-full leading-none"
              >
                {m.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Edit button — always visible */}
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className="flex-shrink-0 p-2 rounded-xl bg-[#fea116]/10 text-[#fea116]
          hover:bg-[#fea116]/20 hover:scale-110
          group-hover:shadow-md group-hover:shadow-[#fea116]/20
          transition-all duration-200"
        title="Edit item"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function CartSidebar({ cart, fullItems, onCheckout, onEditItem }: CartSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isEmpty = fullItems.length === 0;
  const total = cart?.total ?? "$0.00";

  const desktopContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          🛒 Your Cart
        </h2>
        {!isEmpty && (
          <p className="text-[11px] text-slate-400 mt-0.5">
            {fullItems.length} item{fullItems.length !== 1 ? "s" : ""} · Tap to edit
          </p>
        )}
      </div>

      {/* Orange separator */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#fea116]/40 to-transparent" />

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-hide">
        {isEmpty ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <ShoppingCart className="w-7 h-7 text-slate-300 dark:text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">Your cart is empty</p>
              <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-0.5">
                Chat with AI to add items
              </p>
            </div>
          </div>
        ) : (
          fullItems.map((item) => (
            <CartItemCard
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {!isEmpty && (
        <div className="flex-shrink-0 px-4 py-4">
          <div className="mx-1 mb-3 h-px bg-gradient-to-r from-transparent via-[#fea116]/40 to-transparent" />
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="text-xs text-slate-500">Total</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{total}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full rounded-2xl bg-gradient-to-r from-[#fea116] to-[#e89000] py-3 text-sm font-bold text-slate-900 shadow-lg shadow-[#fea116]/25 hover:shadow-xl hover:shadow-[#fea116]/35 hover:-translate-y-0.5 transition-all"
          >
            Go to Checkout
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex w-full">
        <aside className="h-full w-full flex flex-col">
          {desktopContent}
        </aside>
      </div>

      {/* Mobile sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        {!isEmpty && !mobileOpen && (
          <button
            onClick={() => setMobileOpen(true)}
            className="flex w-full items-center justify-between bg-gradient-to-r from-[#fea116] to-[#e89000] px-5 py-3.5 text-slate-900 shadow-lg shadow-[#fea116]/30 rounded-t-2xl"
          >
            <span className="text-sm font-semibold">
              {fullItems.length} item{fullItems.length !== 1 ? "s" : ""} &middot; {total}
            </span>
            <span className="text-sm font-bold">Checkout →</span>
          </button>
        )}

        {/* Mobile bottom sheet */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-sm font-bold flex items-center gap-2">🛒 Your Cart</h2>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="text-lg text-slate-400 hover:text-slate-600 leading-none"
                >
                  ×
                </button>
              </div>
              <div className="space-y-2 p-4">
                {fullItems.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => { setMobileOpen(false); onEditItem(item); }}
                  />
                ))}
              </div>
              <div className="px-4 pb-6 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Total</span>
                  <span className="text-base font-bold">{total}</span>
                </div>
                <button
                  onClick={() => { setMobileOpen(false); onCheckout(); }}
                  className="w-full rounded-2xl bg-gradient-to-r from-[#fea116] to-[#e89000] py-3 text-sm font-bold text-slate-900 shadow-md shadow-[#fea116]/20"
                >
                  Go to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
