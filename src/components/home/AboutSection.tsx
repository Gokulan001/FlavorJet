import Image from "next/image";
import Link from "next/link";
import { Utensils } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";

export default function AboutSection() {
  return (
    <section className="py-16 lg:py-20 bg-white dark:bg-[#0b1120]" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Images Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden shadow-lg animate-fade-in-up">
                <Image
                  src="/about1.jpeg"
                  alt="About FlavorJet"
                  width={300}
                  height={400}
                  className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg animate-fade-in-up animation-delay-200">
                <Image
                  src="/about3.png"
                  alt="Our Kitchen"
                  width={250}
                  height={350}
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
            <div className="space-y-4 pt-8">
              <div className="rounded-2xl overflow-hidden shadow-lg animate-fade-in-up animation-delay-100">
                <Image
                  src="/about2.jpeg"
                  alt="Our Food"
                  width={250}
                  height={350}
                  className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="rounded-2xl overflow-hidden shadow-lg animate-fade-in-up animation-delay-300">
                <Image
                  src="/about4.jpeg"
                  alt="Dining"
                  width={300}
                  height={400}
                  className="w-full h-64 object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-[#fea116] font-medium tracking-wider uppercase mb-2">
              About Us
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0f172b] dark:text-white mb-6">
              Welcome to{" "}
              <Utensils className="inline-block w-8 h-8 text-[#fea116] mx-1" />
              <span className="text-[#fea116]">FlavorJet</span>
            </h2>
            <p className="text-gray-600 dark:text-slate-300 mb-4 leading-relaxed">
              At FlavorJet, we believe every meal should be a celebration. Our passionate
              team of chefs combines traditional recipes with innovative techniques to
              create dishes that tantalize your taste buds.
            </p>
            <p className="text-gray-600 dark:text-slate-300 mb-8 leading-relaxed">
              From hand-selected ingredients to the final garnish, every detail matters.
              Whether you&apos;re dining in or ordering online, we promise an unforgettable
              culinary experience.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#fea116]/5 rounded-xl">
                <span className="text-4xl font-bold text-[#fea116]">
                  <AnimatedCounter target={20} />
                </span>
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">Years of</p>
                  <p className="font-bold text-[#0f172b] dark:text-white uppercase text-sm">Experience</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-[#fea116]/5 rounded-xl">
                <span className="text-4xl font-bold text-[#fea116]">
                  <AnimatedCounter target={50} />
                </span>
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">Popular</p>
                  <p className="font-bold text-[#0f172b] dark:text-white uppercase text-sm">Master Chefs</p>
                </div>
              </div>
            </div>

            <Link
              href="/menu"
              className="inline-flex px-8 py-3.5 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25"
            >
              Explore Menu
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
