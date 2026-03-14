"use client";

import { useState } from "react";
import Image from "next/image";
import { Coffee, Sandwich, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatPrice } from "@/lib/utils";
import StaggerChildren from "@/components/animations/StaggerChildren";

interface PopularItem {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
}

interface PopularMenuTabsProps {
  breakfast: PopularItem[];
  lunch: PopularItem[];
  dinner: PopularItem[];
}

const tabs = [
  { id: "breakfast", label: "Breakfast", subtitle: "Popular", icon: Coffee },
  { id: "lunch", label: "Lunch", subtitle: "Special", icon: Sandwich },
  { id: "dinner", label: "Dinner", subtitle: "Lovely", icon: UtensilsCrossed },
] as const;

export default function PopularMenuTabs({ breakfast, lunch, dinner }: PopularMenuTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("breakfast");

  const getItems = () => {
    switch (activeTab) {
      case "breakfast": return breakfast;
      case "lunch": return lunch;
      case "dinner": return dinner;
      default: return [];
    }
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex justify-center gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-12">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border-2 transition-all duration-300",
              activeTab === tab.id
                ? "border-[#fea116] bg-[#fea116] text-[#0f172b] shadow-lg shadow-[#fea116]/25"
                : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:border-[#fea116]/50"
            )}
          >
            <tab.icon className="w-6 h-6" />
            <div className="text-left hidden sm:block">
              <p className="text-xs opacity-70">{tab.subtitle}</p>
              <p className="font-semibold">{tab.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Menu Items Grid — with crossfade on tab switch */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <StaggerChildren staggerDelay={0.05} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {getItems().map((item, index) => (
              <div
                key={`${activeTab}-${index}`}
                className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-xl overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm text-[#0f172b] dark:text-white line-clamp-1">{item.name}</h4>
                    <span className="text-[#fea116] font-bold text-sm whitespace-nowrap">
                      {formatPrice(item.price)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </StaggerChildren>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
