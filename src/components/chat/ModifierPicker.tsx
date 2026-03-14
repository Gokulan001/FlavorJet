"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { PendingModifiers } from "./types";

interface ModifierPickerProps {
  modifiers: PendingModifiers;
  onSelect: (groupName: string, modifierIds: number[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModifierPicker({ modifiers, onSelect, onConfirm, onCancel }: ModifierPickerProps) {
  if (!modifiers.groups.length) return null;

  const allRequiredComplete = modifiers.groups.every(
    (g) => !g.required || (modifiers.selections[g.name]?.length ?? 0) > 0
  );

  function toggleOption(groupName: string, optId: number, required: boolean) {
    const current = [...(modifiers.selections[groupName] || [])];
    const idx = current.indexOf(optId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (required) {
        // Radio-like: single selection for required groups
        onSelect(groupName, [optId]);
        return;
      }
      current.push(optId);
    }
    onSelect(groupName, current);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex justify-start"
    >
      <div className="bg-white dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-2xl p-4 space-y-4 w-full max-w-[90%] shadow-sm">
        {/* Item name + price */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-[#0f172b] dark:text-white">{modifiers.itemName}</h4>
          <span className="text-xs font-semibold text-[#fea116]">{modifiers.itemPrice}</span>
        </div>

        {/* All modifier groups */}
        {modifiers.groups.map((group) => {
          const selectedIds = modifiers.selections[group.name] || [];
          return (
            <div key={group.name} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">{group.name}</p>
                {group.required ? (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full uppercase tracking-wide">
                    required
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-wide">
                    optional
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleOption(group.name, opt.id, group.required)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border-2 transition-all ${
                        isSelected
                          ? "border-[#fea116] bg-[#fea116]/10 text-[#0f172b] dark:text-white"
                          : "border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:border-[#fea116]/50"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-[#fea116]" />}
                      <span>{opt.name}</span>
                      <span className={`text-[10px] ${opt.price === "Free" ? "text-emerald-500" : "text-[#fea116]"}`}>
                        {opt.price}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!allRequiredComplete}
            className="flex-1 py-2 bg-gradient-to-r from-[#fea116] to-[#e89000] text-[#0f172b] rounded-xl text-xs font-bold hover:shadow-md hover:shadow-[#fea116]/20 transition-all disabled:opacity-40"
          >
            Add to Order
          </button>
        </div>
      </div>
    </motion.div>
  );
}
