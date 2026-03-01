import Image from "next/image";
import Link from "next/link";
import { Search, Star, ArrowLeft } from "lucide-react";
import { searchMenuItems, getAllCategories, getPriceRange } from "@/lib/search";
import type { BadgeType } from "@/lib/search";
import { formatPrice } from "@/lib/utils";
import QuickAddButton from "@/components/menu/QuickAddButton";
import SearchFilters from "@/components/search/SearchFilters";
import { Suspense } from "react";

export const metadata = {
  title: "Search Menu | FlavorJet",
  description: "Search and filter our full menu",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;

  const query = params.q || "";
  const categorySlugs = params.category?.split(",").filter(Boolean) || [];
  const sort = (params.sort as "price_asc" | "price_desc" | "rating" | "name_asc") || "rating";
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const minRating = params.minRating ? Number(params.minRating) : undefined;
  const tags = (params.tags?.split(",").filter(Boolean) || []) as BadgeType[];

  const { items, total } = searchMenuItems({
    query: query || undefined,
    categorySlugs: categorySlugs.length > 0 ? categorySlugs : undefined,
    minPrice,
    maxPrice,
    minRating,
    tags: tags.length > 0 ? tags : undefined,
    sort,
  });

  const allCategories = getAllCategories();
  const priceRange = getPriceRange();

  const hasFilters = query || categorySlugs.length > 0 || tags.length > 0 || minPrice || maxPrice || minRating;

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Header */}
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Menu
          </Link>
          <div className="flex items-center gap-3">
            <Search className="w-8 h-8 text-[#fea116]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                {query ? (
                  <>
                    Results for &ldquo;{query}&rdquo;
                  </>
                ) : (
                  "Explore Menu"
                )}
              </h1>
              <p className="text-gray-400 text-sm">
                {total} dish{total !== 1 ? "es" : ""} found
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex lg:gap-8">
          {/* Filters Sidebar */}
          <Suspense fallback={null}>
            <SearchFilters categories={allCategories} priceRange={priceRange} />
          </Suspense>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {items.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                <Search className="w-16 h-16 text-gray-300 dark:text-slate-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-gray-400 dark:text-slate-500 mb-2">
                  {hasFilters ? "No dishes match your filters" : "Start exploring"}
                </h2>
                <p className="text-gray-400 dark:text-slate-500 mb-4 text-sm">
                  {hasFilters
                    ? "Try adjusting your search or filters"
                    : "Use the search or filters to find dishes"}
                </p>
                {hasFilters && (
                  <Link
                    href="/menu/search"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#fea116] text-[#0f172b] rounded-full font-semibold text-sm hover:bg-[#f3c156] transition-colors"
                  >
                    Clear All Filters
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                {items.map((item, index) => {
                  const badge = item.badge;
                  const BadgeIcon = badge?.icon;

                  return (
                    <div
                      key={item.id}
                      className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                      style={{
                        animationDelay: `${index * 0.04}s`,
                        animationFillMode: "both",
                      }}
                    >
                      <Link href={`/menu/${item.categorySlug}/${item.slug}`}>
                        <div className="relative h-48 overflow-hidden">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />
                          {!item.isAvailable && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <span className="bg-red-500 text-white px-4 py-1 rounded-full font-semibold text-sm">
                                Unavailable
                              </span>
                            </div>
                          )}
                          {badge && BadgeIcon && (
                            <div
                              className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${badge.color} shadow-md`}
                            >
                              <BadgeIcon className="w-3 h-3" />
                              {badge.label}
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <Link href={`/menu/${item.categorySlug}/${item.slug}`}>
                            <h3 className="font-bold text-[#0f172b] dark:text-white group-hover:text-[#fea116] transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-1 text-[#fea116] shrink-0">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="text-sm font-medium">{item.rating}</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">{item.categoryName}</p>
                        <p className="text-gray-500 dark:text-slate-400 text-sm line-clamp-2 mb-4">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-[#fea116]">
                            {formatPrice(item.price)}
                          </span>
                          {item.isAvailable &&
                            (item.hasModifiers ? (
                              <Link
                                href={`/menu/${item.categorySlug}/${item.slug}`}
                                className="px-4 py-2 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold text-sm hover:bg-[#f3c156] transition-colors"
                              >
                                Customize
                              </Link>
                            ) : (
                              <QuickAddButton menuItemId={item.id} />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
