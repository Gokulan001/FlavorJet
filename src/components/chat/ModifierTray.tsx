"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

// ── Types for modifier API response ──────────────────────────────────────────

interface ModifierOptionData {
  id: number;
  name: string;
  priceDelta: number;
  priceDisplay: string;
}

interface ModifierGroupData {
  id: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOptionData[];
}

interface ModifierResponse {
  itemName: string;
  basePrice: string;
  basePriceCents: number;
  groups: ModifierGroupData[];
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ModifierTrayProps {
  slug: string;
  onConfirm: (slug: string, modifierIds: number[], totalCents: number) => void;
  onCancel: () => void;
}

export default function ModifierTray({ slug, onConfirm, onCancel }: ModifierTrayProps) {
  const [data, setData] = useState<ModifierResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<number, number[]>>({}); // groupId → optionIds

  // Fetch modifier data on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/modifiers?slug=${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load options");
        return res.json();
      })
      .then((json: ModifierResponse) => {
        if (cancelled) return;
        setData(json);
        const initial: Record<number, number[]> = {};
        json.groups.forEach((g) => { initial[g.id] = []; });
        setSelections(initial);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Selection logic ────────────────────────────────────────────────────────

  function toggleOption(group: ModifierGroupData, optionId: number) {
    setSelections((prev) => {
      const current = [...(prev[group.id] || [])];
      const idx = current.indexOf(optionId);

      if (idx >= 0) {
        // Deselect
        current.splice(idx, 1);
      } else if (group.required && group.maxSelect === 1) {
        // Radio-like: replace selection
        return { ...prev, [group.id]: [optionId] };
      } else if (current.length < group.maxSelect) {
        // Add if under max
        current.push(optionId);
      } else {
        // At max — do nothing
        return prev;
      }

      return { ...prev, [group.id]: current };
    });
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const allRequiredMet = data
    ? data.groups.every((g) => {
        if (!g.required) return true;
        const sel = selections[g.id] || [];
        return sel.length >= g.minSelect;
      })
    : false;

  // ── Price calculation ──────────────────────────────────────────────────────

  const modifierCents = data
    ? data.groups.reduce((sum, g) => {
        const sel = selections[g.id] || [];
        return sum + g.options
          .filter((o) => sel.includes(o.id))
          .reduce((s, o) => s + o.priceDelta, 0);
      }, 0)
    : 0;

  const totalCents = (data?.basePriceCents ?? 0) + modifierCents;
  const allSelectedIds = Object.values(selections).flat();

  // ── Render ─────────────────────────────────────────────────────────────────

  const slideAnim = {
    initial: { y: 40, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: "spring" as const, stiffness: 350, damping: 34 },
  };

  if (loading) {
    return (
      <motion.div {...slideAnim} className="mx-1 mb-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 p-6">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading options...
        </div>
      </motion.div>
    );
  }

  if (error || !data) {
    return (
      <motion.div {...slideAnim} className="mx-1 mb-2 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error || "Something went wrong"}</p>
        <button onClick={onCancel} className="mt-2 text-xs text-red-500 hover:underline">Close</button>
      </motion.div>
    );
  }

  if (data.groups.length === 0) {
    onConfirm(slug, [], data.basePriceCents);
    return null;
  }

  return (
    <motion.div
      {...slideAnim}
      className="mx-1 mb-2 rounded-3xl border border-slate-200/50 dark:border-slate-700/40 bg-white/90 dark:bg-slate-800/80 backdrop-blur-sm shadow-xl dark:shadow-slate-900/40"
    >

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{data.itemName}</h4>
          <p className="text-xs text-slate-500">Customize your order</p>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Groups */}
      <div className="p-4 space-y-4 max-h-[280px] overflow-y-auto scrollbar-hide">
        {data.groups.map((group) => {
          const selected = selections[group.id] || [];
          return (
            <div key={group.id} className="space-y-2">
              {/* Group label */}
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{group.name}</p>
                {group.required ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full uppercase tracking-wide">
                    Required
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-wide">
                    Optional
                  </span>
                )}
                {group.maxSelect > 1 && (
                  <span className="text-[10px] text-slate-400">
                    {selected.length}/{group.maxSelect}
                  </span>
                )}
              </div>

              {/* Option chips */}
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const isSelected = selected.includes(opt.id);
                  const atMax = selected.length >= group.maxSelect && !isSelected;

                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: atMax ? 1 : 1.03 }}
                      whileTap={{ scale: atMax ? 1 : 0.97 }}
                      onClick={() => !atMax && toggleOption(group, opt.id)}
                      disabled={atMax}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        isSelected
                          ? "border-[#fea116] bg-[#fea116]/10 text-slate-900 dark:text-white"
                          : atMax
                          ? "border-slate-100 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                          : "border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-[#fea116]/50"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#fea116]" />}
                      <span>{opt.name}</span>
                      <span className={`text-[10px] ${opt.priceDelta === 0 ? "text-emerald-500" : "text-[#fea116]"}`}>
                        {opt.priceDisplay}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: price + confirm */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(slug, allSelectedIds, totalCents)}
          disabled={!allRequiredMet}
          className="flex-1 py-2.5 bg-gradient-to-r from-[#fea116] to-[#e89000] text-slate-900 rounded-xl text-sm font-bold hover:shadow-md hover:shadow-[#fea116]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Add to Cart — {formatPrice(totalCents)}
        </button>
      </div>
    </motion.div>
  );
}
