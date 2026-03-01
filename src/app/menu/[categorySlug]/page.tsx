import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowLeft, Flame, TrendingUp, Sparkles } from "lucide-react";
import { db } from "@/db";
import { categories, menuItems, modifierGroups } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import QuickAddButton from "@/components/menu/QuickAddButton";
import SearchBar from "@/components/menu/SearchBar";

interface Props {
  params: Promise<{ categorySlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { categorySlug } = await params;
  const category = db
    .select()
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .get();

  if (!category) return { title: "Category Not Found" };
  return {
    title: `${category.name} | FlavorJet Menu`,
    description: category.description,
  };
}

const spicyItems = [
  "stuffed-jalapeno-poppers", "penne-arrabiata", "spicy-black-bean-burger",
  "spicy-pumpkin-soup", "fish-tacos",
];

const bestsellerItems = [
  "classic-beef-burger", "margherita-pizza", "spaghetti-carbonara",
  "grilled-salmon", "chocolate-lava-cake", "ribeye-steak",
  "classic-caesar-salad", "clam-chowder",
];

const newItems = [
  "caprese-bruschetta", "mediterranean-chickpea-salad", "mushroom-risotto",
  "turkey-and-avocado-wrap", "hawaiian-pizza", "crab-cakes",
  "fruit-tart", "grilled-vegetable-platter",
];

function getItemBadge(slug: string) {
  if (bestsellerItems.includes(slug)) return { label: "Bestseller", color: "bg-[#fea116] text-[#0f172b]", icon: TrendingUp };
  if (spicyItems.includes(slug)) return { label: "Spicy", color: "bg-red-500 text-white", icon: Flame };
  if (newItems.includes(slug)) return { label: "New", color: "bg-emerald-500 text-white", icon: Sparkles };
  return null;
}

export default async function CategoryPage({ params }: Props) {
  const { categorySlug } = await params;

  const category = db
    .select()
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .get();

  if (!category) notFound();

  const items = db
    .select()
    .from(menuItems)
    .where(eq(menuItems.categoryId, category.id))
    .orderBy(asc(menuItems.name))
    .all();

  const itemsWithModifierInfo = items.map((item) => {
    const groups = db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.menuItemId, item.id))
      .all();
    return { ...item, hasModifiers: groups.length > 0 };
  });

  return (
    <>
      {/* Category Banner */}
      <div
        className="relative h-64 sm:h-72 flex items-center overflow-hidden"
        style={{ backgroundColor: category.bgColor }}
      >
        <div className="absolute inset-0 bg-[#0f172b]">
          <Image
            src={category.imageUrl}
            alt={category.name}
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> All Categories
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 animate-slide-in-left">
            {category.name}
          </h1>
          <p className="text-gray-300 text-lg animate-slide-in-left animation-delay-100">
            {category.description}
          </p>
        </div>
      </div>

      {/* Items */}
      <section className="py-12 bg-white dark:bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search */}
          <SearchBar />

          {/* Items Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8" id="items-grid">
            {itemsWithModifierInfo.map((item, index) => {
              const badge = getItemBadge(item.slug);
              const BadgeIcon = badge?.icon;

              return (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animationFillMode: "both",
                  }}
                  data-item-name={item.name.toLowerCase()}
                >
                  <Link href={`/menu/${categorySlug}/${item.slug}`}>
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
                        <div className={`absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${badge.color} shadow-md`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link href={`/menu/${categorySlug}/${item.slug}`}>
                        <h3 className="font-bold text-[#0f172b] dark:text-white group-hover:text-[#fea116] transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-1 text-[#fea116] shrink-0">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{item.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-500 dark:text-slate-400 text-sm line-clamp-2 mb-4">
                      {item.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-[#fea116]">
                        {formatPrice(item.price)}
                      </span>
                      {item.isAvailable && (
                        item.hasModifiers ? (
                          <Link
                            href={`/menu/${categorySlug}/${item.slug}`}
                            className="px-4 py-2 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold text-sm hover:bg-[#f3c156] transition-colors"
                          >
                            Customize
                          </Link>
                        ) : (
                          <QuickAddButton menuItemId={item.id} />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {items.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 dark:text-slate-500 text-lg">No items in this category yet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
