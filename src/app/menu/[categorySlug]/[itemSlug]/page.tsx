import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, ArrowLeft, Clock, Flame } from "lucide-react";
import { db } from "@/db";
import { categories, menuItems, modifierGroups, modifiers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { formatPrice } from "@/lib/utils";
import AddToCartButton from "@/components/menu/AddToCartButton";
import ModifierSelector from "@/components/menu/ModifierSelector";

interface Props {
  params: Promise<{ categorySlug: string; itemSlug: string }>;
  searchParams: Promise<{ edit?: string; qty?: string; mods?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { categorySlug, itemSlug } = await params;
  const category = db.select().from(categories).where(eq(categories.slug, categorySlug)).get();
  if (!category) return { title: "Not Found" };

  const item = db
    .select()
    .from(menuItems)
    .where(eq(menuItems.slug, itemSlug))
    .all()
    .find((i) => i.categoryId === category.id);

  if (!item) return { title: "Not Found" };
  return {
    title: `${item.name} | FlavorJet`,
    description: item.description,
  };
}

export default async function ItemDetailPage({ params, searchParams }: Props) {
  const { categorySlug, itemSlug } = await params;
  const sp = await searchParams;
  const editCartItemId = sp.edit ? Number(sp.edit) : null;
  const editQty = sp.qty ? Number(sp.qty) : null;
  const editMods = sp.mods ? sp.mods.split(",").map(Number).filter(Boolean) : null;

  const category = db.select().from(categories).where(eq(categories.slug, categorySlug)).get();
  if (!category) notFound();

  const item = db
    .select()
    .from(menuItems)
    .where(eq(menuItems.slug, itemSlug))
    .all()
    .find((i) => i.categoryId === category.id);

  if (!item) notFound();

  // Get modifier groups with their modifiers
  const groups = db
    .select()
    .from(modifierGroups)
    .where(eq(modifierGroups.menuItemId, item.id))
    .all();

  const groupsWithModifiers = groups.map((group) => {
    const groupModifiers = db
      .select()
      .from(modifiers)
      .where(eq(modifiers.modifierGroupId, group.id))
      .all();
    return { ...group, modifiers: groupModifiers };
  });

  const hasModifiers = groupsWithModifiers.length > 0;

  // Get related items from same category
  const relatedItems = db
    .select()
    .from(menuItems)
    .where(eq(menuItems.categoryId, category.id))
    .all()
    .filter((i) => i.id !== item.id)
    .slice(0, 3);

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-[#0f172b] border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm min-w-0">
            <Link href="/menu" className="text-gray-400 hover:text-[#fea116] transition-colors font-medium flex-shrink-0">
              Menu
            </Link>
            <span className="text-gray-600 flex-shrink-0">/</span>
            <Link href={`/menu/${categorySlug}`} className="text-gray-400 hover:text-[#fea116] transition-colors font-medium flex-shrink-0">
              {category.name}
            </Link>
            <span className="text-gray-600 flex-shrink-0">/</span>
            <span className="text-[#fea116] font-semibold truncate">{item.name}</span>
          </nav>
        </div>
      </div>

      <section className="py-8 sm:py-12 bg-white dark:bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Image — sticky centered on desktop */}
            <div className="lg:sticky lg:top-[calc(50vh-250px)] animate-slide-in-left">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <div className="relative h-64 sm:h-96 lg:h-[500px]">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
                {!item.isAvailable && (
                  <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-1 rounded-full font-semibold text-sm">
                    Currently Unavailable
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="animate-slide-in-right">
              <Link
                href={`/menu/${categorySlug}`}
                className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#fea116] mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back to {category.name}
              </Link>

              <h1 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white mb-4">
                {item.name}
              </h1>

              {/* Rating & Info */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
                <div className="flex items-center gap-1 bg-[#fea116]/10 px-3 py-1.5 rounded-full">
                  <Star className="w-4 h-4 text-[#fea116] fill-current" />
                  <span className="font-semibold text-[#fea116]">{item.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>15-25 min</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500 dark:text-slate-400 text-sm">
                  <Flame className="w-4 h-4" />
                  <span>{category.name}</span>
                </div>
              </div>

              <p className="text-gray-600 dark:text-slate-300 leading-relaxed mb-8 text-lg">
                {item.description}
              </p>

              <div className="text-3xl font-bold text-[#fea116] mb-8">
                {formatPrice(item.price)}
              </div>

              {/* Modifier Selector or Simple Add */}
              {item.isAvailable ? (
                hasModifiers ? (
                  <ModifierSelector
                    menuItemId={item.id}
                    basePrice={item.price}
                    modifierGroups={groupsWithModifiers}
                    editCartItemId={editCartItemId}
                    initialQuantity={editQty}
                    initialModifierIds={editMods}
                  />
                ) : (
                  <AddToCartButton menuItemId={item.id} />
                )
              ) : (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
                  This item is currently unavailable. Please check back later.
                </div>
              )}
            </div>
          </div>

          {/* Related Items */}
          {relatedItems.length > 0 && (
            <div className="mt-12 sm:mt-16 lg:mt-20">
              <h2 className="text-2xl font-bold text-[#0f172b] dark:text-white mb-6 sm:mb-8">
                More from {category.name}
              </h2>
              <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
                {relatedItems.map((related) => (
                  <Link
                    key={related.id}
                    href={`/menu/${categorySlug}/${related.slug}`}
                    className="group bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all duration-300"
                  >
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={related.imageUrl}
                        alt={related.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="33vw"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#0f172b] dark:text-white group-hover:text-[#fea116] transition-colors">
                        {related.name}
                      </h3>
                      <p className="text-[#fea116] font-bold mt-1">{formatPrice(related.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
