"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (tipCents: number) => void;
}

const tipOptions = [
  { label: "No Tip", percent: 0 },
  { label: "10%", percent: 10 },
  { label: "15%", percent: 15 },
  { label: "20%", percent: 20 },
];

export default function TipSelector({ subtotal, onTipChange }: TipSelectorProps) {
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null);
  const [customTip, setCustomTip] = useState("");

  const handleSelectPercent = (percent: number) => {
    setSelectedPercent(percent);
    setCustomTip("");
    const tipCents = Math.round((subtotal * percent) / 100);
    onTipChange(tipCents);
  };

  const handleCustomTip = (value: string) => {
    setSelectedPercent(null);
    setCustomTip(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onTipChange(Math.round(parsed * 100));
    } else {
      onTipChange(0);
    }
  };

  const currentTip = selectedPercent !== null
    ? Math.round((subtotal * selectedPercent) / 100)
    : customTip
      ? Math.round(parseFloat(customTip || "0") * 100)
      : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="w-5 h-5 text-[#fea116]" />
        <h3 className="font-bold text-[#0f172b] dark:text-white">Add a Tip</h3>
      </div>
      <p className="text-sm text-gray-500 dark:text-slate-400">Show your appreciation for our delivery team</p>

      <div className="grid grid-cols-4 gap-2">
        {tipOptions.map((opt) => (
          <button
            key={opt.percent}
            type="button"
            onClick={() => handleSelectPercent(opt.percent)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
              selectedPercent === opt.percent
                ? "bg-[#fea116] text-[#0f172b] shadow-md"
                : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 font-medium">$</span>
        <input
          type="number"
          min="0"
          step="0.50"
          value={customTip}
          onChange={(e) => handleCustomTip(e.target.value)}
          placeholder="Custom amount"
          className={`w-full pl-8 pr-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-slate-700 text-[#0f172b] dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fea116]/30 focus:border-[#fea116] transition-all ${
            selectedPercent === null && customTip ? "border-[#fea116]" : "border-gray-200 dark:border-slate-600"
          }`}
        />
      </div>

      {currentTip > 0 && (
        <p className="text-sm text-[#fea116] font-medium text-right">
          Tip: {formatPrice(currentTip)}
        </p>
      )}
    </div>
  );
}
