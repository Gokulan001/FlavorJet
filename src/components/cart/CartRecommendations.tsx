"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, Plus, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { quickAddToCart } from "@/actions/cart-actions";

interface RecommendedItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  rating: string;
  categorySlug: string;
  categoryName: string;
  hasModifiers: boolean;
}

interface CartRecommendationsProps {
  items: RecommendedItem[];
}

function CompactAddButton({ menuItemId }: { menuItemId: number }) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    startTransition(async () => {
      const result = await quickAddToCart(menuItemId);
      if (result && "error" in result && result.error === "not_authenticated") {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="w-8 h-8 flex items-center justify-center bg-[#fea116] text-[#0f172b] rounded-lg hover:bg-[#f3c156] transition-all duration-200 disabled:opacity-70 flex-shrink-0"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : added ? (
        <Check className="w-4 h-4" />
      ) : (
        <Plus className="w-4 h-4" strokeWidth={2.5} />
      )}
    </button>
  );
}

export default function CartRecommendations({ items }: CartRecommendationsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 200; // approx card width + gap
    el.scrollBy({ left: direction === "left" ? -cardWidth * 2 : cardWidth * 2, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4 sm:p-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#fea116]" />
          <h3 className="font-bold text-[#0f172b] dark:text-white">You Might Also Like</h3>
        </div>

        {/* Scroll arrows — desktop only */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4 text-[#0f172b] dark:text-white" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-full border border-gray-200 dark:border-slate-600 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4 text-[#0f172b] dark:text-white" />
          </button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex-shrink-0 w-44 sm:w-48 bg-gray-50 dark:bg-slate-700 rounded-xl overflow-hidden hover:shadow-md transition-all duration-300 snap-start animate-fade-in-up"
            style={{
              animationDelay: `${index * 0.05}s`,
              animationFillMode: "both",
            }}
          >
            {/* Image */}
            <Link href={`/menu/${item.categorySlug}/${item.slug}`}>
              <div className="relative h-28 overflow-hidden group">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                  sizes="192px"
                />
              </div>
            </Link>

            {/* Info */}
            <div className="p-3">
              <Link href={`/menu/${item.categorySlug}/${item.slug}`}>
                <h4 className="font-semibold text-sm text-[#0f172b] dark:text-white line-clamp-1 hover:text-[#fea116] transition-colors">
                  {item.name}
                </h4>
              </Link>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{item.categoryName}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[#fea116] font-bold text-sm">
                  {formatPrice(item.price)}
                </span>
                {item.hasModifiers ? (
                  <Link
                    href={`/menu/${item.categorySlug}/${item.slug}`}
                    className="px-2.5 py-1.5 bg-[#fea116] text-[#0f172b] rounded-lg font-semibold text-xs hover:bg-[#f3c156] transition-colors"
                  >
                    Customize
                  </Link>
                ) : (
                  <CompactAddButton menuItemId={item.id} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
