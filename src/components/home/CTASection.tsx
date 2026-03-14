import Link from "next/link";
import { ArrowRight, UtensilsCrossed } from "lucide-react";

export default function CTASection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dark background with radial glow */}
      <div className="absolute inset-0 bg-[#0f172b]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(254,161,22,0.25)_0%,_transparent_70%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#fea116]/10 rounded-full blur-[100px]" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fea116]/10 border border-[#fea116]/20 mb-8">
          <UtensilsCrossed className="w-4 h-4 text-[#fea116]" />
          <span className="text-sm font-medium text-[#fea116]">
            Experience the Taste
          </span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Ready to{" "}
          <span className="text-[#fea116]">Order?</span>
        </h2>

        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Explore our curated menu of premium dishes crafted by world-class
          chefs. Your next favorite meal is just a click away.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/menu"
            className="group flex items-center gap-3 px-8 py-4 bg-[#fea116] text-[#0f172b] rounded-2xl font-bold text-lg hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25"
          >
            Explore Menu
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/menu/search"
            className="flex items-center gap-3 px-8 py-4 border border-gray-600 text-white rounded-2xl font-bold text-lg hover:border-[#fea116] hover:text-[#fea116] transition-all duration-300"
          >
            Search Dishes
          </Link>
        </div>
      </div>
    </section>
  );
}
