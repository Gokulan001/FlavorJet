"use client";

import { motion } from "framer-motion";
import { Star, ShoppingCart, ChevronRight, Flame, Sparkles, Zap } from "lucide-react";
import Image from "next/image";

export interface MenuItemData {
  id: number;
  name: string;
  price: string;
  rating: string;
  description: string;
  category: string;
  categorySlug: string;
  itemSlug: string;
  imageUrl: string;
  badge: string;
  hasModifiers: boolean;
  customizeUrl: string;
}

interface MenuItemCardProps {
  item: MenuItemData;
  index: number;
  onQuickAdd?: (itemId: number) => void;
  onViewDetails?: (url: string) => void;
}

function BadgeIcon({ badge }: { badge: string }) {
  if (badge.includes("Bestseller")) return <Flame className="w-3 h-3" />;
  if (badge.includes("Spicy")) return <Zap className="w-3 h-3" />;
  if (badge.includes("New")) return <Sparkles className="w-3 h-3" />;
  return null;
}

function badgeColor(badge: string): string {
  if (badge.includes("Bestseller")) return "bg-orange-500/90 text-white";
  if (badge.includes("Spicy")) return "bg-red-500/90 text-white";
  if (badge.includes("New")) return "bg-emerald-500/90 text-white";
  return "bg-gray-500/90 text-white";
}

export default function MenuItemCard({ item, index, onQuickAdd, onViewDetails }: MenuItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 400, damping: 30 }}
      className="group relative w-[155px] flex-shrink-0 bg-white dark:bg-slate-800/90 rounded-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden shadow-sm hover:shadow-md hover:shadow-[#fea116]/10 transition-all hover:-translate-y-0.5"
    >
      {/* Image */}
      <div className="relative h-[90px] bg-gradient-to-br from-[#fea116]/10 to-[#fea116]/5 overflow-hidden">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="155px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
        )}

        {/* Badge */}
        {item.badge && (
          <div className={`absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-bold ${badgeColor(item.badge)}`}>
            <BadgeIcon badge={item.badge} />
            <span>{item.badge.replace(/🔥|🌶️|✨/g, "").trim()}</span>
          </div>
        )}

        {/* Rating pill */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
          <Star className="w-2.5 h-2.5 text-[#fea116] fill-[#fea116]" />
          <span className="text-[9px] font-bold text-white">{item.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5 space-y-1.5">
        <h4 className="text-[11px] font-bold text-[#0f172b] dark:text-white leading-tight line-clamp-2 min-h-[28px]">
          {item.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-[#fea116]">{item.price}</span>
          {item.hasModifiers ? (
            <button
              onClick={() => onViewDetails?.(item.customizeUrl || `/menu/${item.categorySlug}/${item.itemSlug}`)}
              className="p-1.5 rounded-lg bg-[#fea116]/10 text-[#fea116] hover:bg-[#fea116]/20 transition-colors"
              title="Customize"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => onQuickAdd?.(item.id)}
              className="p-1.5 rounded-lg bg-[#fea116] text-[#0f172b] hover:bg-[#f3c156] transition-colors shadow-sm"
              title="Quick add"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
