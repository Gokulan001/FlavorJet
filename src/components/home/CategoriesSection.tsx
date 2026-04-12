import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { asc } from "drizzle-orm";
import StaggerChildren from "@/components/animations/StaggerChildren";
import ShinyText from "@/components/reactbits/ShinyText";

export default function CategoriesSection() {
  const allCategories = db
    .select()
    .from(categories)
    .orderBy(asc(categories.displayOrder))
    .limit(5)
    .all();

  return (
    <section className="py-20 lg:py-28" id="categories">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-end justify-between mb-8 sm:mb-12">
          <div>
            <p className="font-medium tracking-wider uppercase mb-2">
              <ShinyText text="Popular Categories" speed={4} className="text-sm" />
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white">
              Browse Our Hottest
              <br />
              <span className="text-[#fea116]">Categories</span>
            </h2>
          </div>
          <Link
            href="/menu"
            className="hidden sm:flex items-center gap-2 text-[#fea116] font-semibold hover:gap-3 transition-all duration-300"
          >
            See All <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Categories Grid */}
        <StaggerChildren className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {allCategories.map((category) => (
            <Link
              key={category.id}
              href={`/menu/${category.slug}`}
              className="group relative block rounded-2xl p-4 sm:p-5 lg:p-6 text-center transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              style={{ backgroundColor: category.bgColor }}
            >
              {/* Image Circle */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 rounded-full overflow-hidden shadow-md">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                  sizes="96px"
                  priority={false}
                />
              </div>

              {/* Text Content */}
              <h3 className="font-semibold text-[#0f172b] dark:text-white text-sm sm:text-base mb-1 line-clamp-1">
                {category.name}
              </h3>
              <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 mb-3 min-h-8">
                {category.description}
              </p>

              {/* Arrow Icon */}
              <ArrowRight className="w-4 h-4 text-[#fea116] mx-auto opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
            </Link>
          ))}
        </StaggerChildren>

        {/* Mobile See All */}
        <div className="flex sm:hidden justify-center mt-8">
          <Link
            href="/menu"
            className="flex items-center gap-2 px-6 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-colors"
          >
            See All Categories <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
