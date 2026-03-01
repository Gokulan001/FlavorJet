import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { menuItems, categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import PopularMenuTabs from "./PopularMenuTabs";

export default function PopularMenuSection() {
  // Get items for popular display - grab from different categories
  const allItems = db
    .select({
      name: menuItems.name,
      description: menuItems.description,
      price: menuItems.price,
      imageUrl: menuItems.imageUrl,
      categoryId: menuItems.categoryId,
    })
    .from(menuItems)
    .orderBy(asc(menuItems.id))
    .all();

  // Split into 3 groups for tabs, limit to 12 per tab (3 full rows of 4)
  const third = Math.ceil(allItems.length / 3);
  const breakfast = allItems.slice(0, third).slice(0, 12);
  const lunch = allItems.slice(third, third * 2).slice(0, 12);
  const dinner = allItems.slice(third * 2).slice(0, 12);

  return (
    <section className="py-16 lg:py-20 bg-[#f8f9fa] dark:bg-[#0b1120]" id="popular">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[#fea116] font-medium tracking-wider uppercase mb-2">
            Food Menu
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white">
            Most Popular Items
          </h2>
        </div>

        <PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />

        {/* View Full Menu */}
        <div className="flex justify-center mt-10">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#fea116] text-[#0f172b] rounded-full font-bold hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25"
          >
            View Full Menu <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
