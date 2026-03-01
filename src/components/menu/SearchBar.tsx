"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

export default function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    const grid = document.getElementById("items-grid");
    if (!grid) return;

    const cards = grid.children;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i] as HTMLElement;
      const itemName = card.getAttribute("data-item-name") || "";
      if (value === "" || itemName.includes(value.toLowerCase())) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    }
  };

  return (
    <div className="relative max-w-md">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search dishes..."
        className="w-full pl-12 pr-10 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/50 focus:border-[#fea116] transition-all"
      />
      {query && (
        <button
          onClick={() => handleSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
