import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { asc, eq, count } from "drizzle-orm";

export const metadata = {
  title: "Menu | FlavorJet",
  description: "Browse our delicious menu categories",
};

export default function MenuPage() {
  const allCategories = db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder))
    .all();

  // Get item counts per category
  const itemCounts = db
    .select({
      categoryId: menuItems.categoryId,
      count: count(),
    })
    .from(menuItems)
    .groupBy(menuItems.categoryId)
    .all();

  const countMap = new Map(itemCounts.map((ic) => [ic.categoryId, ic.count]));

  return (
    <>
      {/* Hero Banner */}
      <div className="relative h-64 sm:h-80 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[#0f172b]">
          <Image
            src="/bg-hero-2.jpg"
            alt="Menu"
            fill
            className="object-cover opacity-30"
          />
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 animate-fade-in-up">
            Our <span className="text-[#fea116]">Menu</span>
          </h1>
          <p className="text-gray-300 text-lg animate-fade-in-up animation-delay-200">
            Explore a variety of mouthwatering dishes handpicked just for you
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <section className="py-12 sm:py-16 bg-white dark:bg-[#0b1120]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {allCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/menu/${category.slug}`}
                className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 animate-fade-in-up"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: "both",
                }}
              >
                <div className="relative h-56">
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f172b]/80 via-[#0f172b]/20 to-transparent" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">
                        {category.name}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {countMap.get(category.id) ?? 0} items
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#fea116] flex items-center justify-center group-hover:bg-white transition-colors duration-300">
                      <ArrowRight className="w-5 h-5 text-[#0f172b]" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
