"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  Star,
  TrendingUp,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface SearchFiltersProps {
  categories: Category[];
  priceRange: { min: number; max: number };
}

const SORT_OPTIONS = [
  { value: "rating", label: "Top Rated" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A-Z" },
];

const TAG_OPTIONS = [
  { value: "bestseller", label: "Bestseller", icon: TrendingUp, color: "bg-[#fea116]/10 text-[#fea116] border-[#fea116]/30" },
  { value: "spicy", label: "Spicy", icon: Flame, color: "bg-red-500/10 text-red-500 border-red-500/30" },
  { value: "new", label: "New", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
];

export default function SearchFilters({ categories, priceRange }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    rating: true,
    tags: true,
  });

  // Read current params
  const currentQuery = searchParams.get("q") || "";
  const currentCategories = searchParams.get("category")?.split(",").filter(Boolean) || [];
  const currentSort = searchParams.get("sort") || "rating";
  const currentMinPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : priceRange.min;
  const currentMaxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : priceRange.max;
  const currentMinRating = searchParams.get("minRating") ? Number(searchParams.get("minRating")) : 0;
  const currentTags = searchParams.get("tags")?.split(",").filter(Boolean) || [];

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.push(`/menu/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const toggleCategory = (slug: string) => {
    const updated = currentCategories.includes(slug)
      ? currentCategories.filter((c) => c !== slug)
      : [...currentCategories, slug];
    updateParams({ category: updated.length > 0 ? updated.join(",") : undefined });
  };

  const toggleTag = (tag: string) => {
    const updated = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateParams({ tags: updated.length > 0 ? updated.join(",") : undefined });
  };

  const clearAll = () => {
    router.push("/menu/search");
  };

  const hasActiveFilters =
    currentCategories.length > 0 ||
    currentTags.length > 0 ||
    currentMinRating > 0 ||
    currentMinPrice > priceRange.min ||
    currentMaxPrice < priceRange.max;

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const filterContent = (
    <div className="space-y-5">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
        <input
          type="text"
          defaultValue={currentQuery}
          onChange={(e) => {
            const value = e.target.value;
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            searchTimerRef.current = setTimeout(() => {
              updateParams({ q: value || undefined });
            }, 400);
          }}
          placeholder="Search dishes..."
          className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/50 focus:border-[#fea116] transition-all"
        />
        {currentQuery && (
          <button
            onClick={() => updateParams({ q: undefined })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors"
          >
            <X className="w-3.5 h-3.5 text-gray-400 dark:text-slate-400" />
          </button>
        )}
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
          Sort By
        </label>
        <select
          value={currentSort}
          onChange={(e) => updateParams({ sort: e.target.value === "rating" ? undefined : e.target.value })}
          className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-[#0f172b] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#fea116]/50 focus:border-[#fea116] transition-all"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection("categories")}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2"
        >
          Categories
          {expandedSections.categories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandedSections.categories && (
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = currentCategories.includes(cat.slug);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive
                      ? "bg-[#fea116] text-[#0f172b] border-[#fea116]"
                      : "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-[#fea116]/50"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection("price")}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2"
        >
          Price Range
          {expandedSections.price ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandedSections.price && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <input
                type="number"
                defaultValue={(currentMinPrice / 100).toFixed(0)}
                onBlur={(e) => {
                  const val = Math.round(Number(e.target.value) * 100);
                  updateParams({ minPrice: val > priceRange.min ? String(val) : undefined });
                }}
                placeholder="Min"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/50 focus:border-[#fea116] transition-all"
              />
            </div>
            <span className="text-gray-400 dark:text-slate-500 text-xs">to</span>
            <div className="flex-1">
              <input
                type="number"
                defaultValue={(currentMaxPrice / 100).toFixed(0)}
                onBlur={(e) => {
                  const val = Math.round(Number(e.target.value) * 100);
                  updateParams({ maxPrice: val < priceRange.max ? String(val) : undefined });
                }}
                placeholder="Max"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/50 focus:border-[#fea116] transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Rating */}
      <div>
        <button
          onClick={() => toggleSection("rating")}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2"
        >
          Minimum Rating
          {expandedSections.rating ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandedSections.rating && (
          <div className="flex gap-2">
            {[0, 3, 3.5, 4, 4.5].map((rating) => (
              <button
                key={rating}
                onClick={() => updateParams({ minRating: rating > 0 ? String(rating) : undefined })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  currentMinRating === rating
                    ? "bg-[#fea116] text-[#0f172b] border-[#fea116]"
                    : "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-[#fea116]/50"
                }`}
              >
                {rating === 0 ? (
                  "All"
                ) : (
                  <>
                    <Star className="w-3 h-3 fill-current" />
                    {rating}+
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <button
          onClick={() => toggleSection("tags")}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2"
        >
          Tags
          {expandedSections.tags ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandedSections.tags && (
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map((tag) => {
              const isActive = currentTags.includes(tag.value);
              const TagIcon = tag.icon;
              return (
                <button
                  key={tag.value}
                  onClick={() => toggleTag(tag.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    isActive ? tag.color + " border-current" : "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-[#fea116]/50"
                  }`}
                >
                  <TagIcon className="w-3 h-3" />
                  {tag.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="w-full py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors font-medium"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <div className="sticky top-20 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-5 shadow-sm">
          <h3 className="font-bold text-[#0f172b] dark:text-white mb-4 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#fea116]" />
            Filters
          </h3>
          {filterContent}
        </div>
      </aside>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold shadow-lg shadow-[#fea116]/25 hover:bg-[#f3c156] transition-all"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-[#0f172b] text-white text-xs rounded-full flex items-center justify-center">
              {currentCategories.length + currentTags.length + (currentMinRating > 0 ? 1 : 0)}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-white dark:bg-slate-800 rounded-t-3xl overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-[#0f172b] dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#fea116]" />
                Filters
              </h3>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="p-5">{filterContent}</div>
            <div className="sticky bottom-0 bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 p-4">
              <button
                onClick={() => setMobileOpen(false)}
                className="w-full py-3 bg-[#fea116] text-[#0f172b] rounded-xl font-bold hover:bg-[#f3c156] transition-colors"
              >
                Show Results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
