"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star, ShoppingCart, Settings2 } from "lucide-react";
import Image from "next/image";
import type { MinimalMenuItem } from "./types";
import { useMenuImages } from "./MenuImagesContext";

interface MenuItemCardProps {
  item: MinimalMenuItem;
  index: number;
  onAddToCart?: (slug: string) => void;
  onCustomize?: (slug: string) => void;
}

function DietaryBadges({ item }: { item: MinimalMenuItem }) {
  const badges: { label: string; color: string }[] = [];
  if (item.vegan) badges.push({ label: "VG", color: "bg-green-500" });
  else if (item.vegetarian) badges.push({ label: "V", color: "bg-emerald-500" });
  if (item.glutenFree) badges.push({ label: "GF", color: "bg-blue-500" });
  if (badges.length === 0) return null;

  return (
    <div className="absolute top-1.5 left-1.5 flex gap-0.5">
      {badges.map((b) => (
        <span
          key={b.label}
          className={`${b.color} text-white text-[7px] font-bold px-1 py-0.5 rounded-full leading-none`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

export default function MenuItemCard({ item, index, onAddToCart, onCustomize }: MenuItemCardProps) {
  const imageMap = useMenuImages();
  const imageUrl = item.imageUrl ?? imageMap.get(item.slug);
  const [imageError, setImageError] = React.useState(false);

  const handleCardClick = () => {
    if (item.hasModifiers) {
      onCustomize?.(item.slug);
    } else {
      onAddToCart?.(item.slug);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 400, damping: 30 }}
      onClick={handleCardClick}
      className="group relative w-[155px] flex-shrink-0 bg-white/85 dark:bg-slate-800/85 backdrop-blur-lg rounded-3xl border border-white/70 dark:border-slate-700/50 overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-slate-900/40 hover:shadow-2xl hover:shadow-[#fea116]/20 transition-all duration-200 hover:-translate-y-2 cursor-pointer"
    >
      {/* Image */}
      <div className="relative h-[90px] bg-gradient-to-br from-[#fea116]/10 to-[#fea116]/5 overflow-hidden">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="155px"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            <span role="img" aria-label="food">&#127869;</span>
          </div>
        )}

        {/* Dietary badges */}
        <DietaryBadges item={item} />

        {/* Rating pill */}
        <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded-full">
          <Star className="w-2.5 h-2.5 text-[#fea116] fill-[#fea116]" />
          <span className="text-[9px] font-bold text-white">{item.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 space-y-1">
        <h4 className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 min-h-[20px]">
          {item.name}
        </h4>
        <div className="flex items-center justify-between">
          <span className="text-sm font-extrabold text-[#fea116]">{item.price}</span>
          {item.hasModifiers ? (
            <button
              onClick={(e) => { e.stopPropagation(); onCustomize?.(item.slug); }}
              className="p-1.5 rounded-lg bg-[#fea116]/15 text-[#fea116] border border-[#fea116]/30
                hover:bg-[#fea116]/25 hover:border-[#fea116]/50 hover:shadow-lg hover:shadow-[#fea116]/30
                transition-all duration-200"
              title="Customize"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onAddToCart?.(item.slug); }}
              className="p-1.5 rounded-lg bg-[#fea116] text-slate-900 border border-[#fea116]
                hover:bg-[#f3c156] hover:shadow-lg hover:shadow-[#fea116]/40
                transition-all duration-200"
              title="Add to cart"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
