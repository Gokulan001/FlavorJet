"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Minus, Plus, Loader2, Check } from "lucide-react";
import { addToCart, removeFromCart } from "@/actions/cart-actions";
import { formatPrice, cn } from "@/lib/utils";

interface Modifier {
  id: number;
  modifierGroupId: number;
  name: string;
  priceAdjustment: number;
}

interface ModifierGroup {
  id: number;
  menuItemId: number;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: Modifier[];
}

interface ModifierSelectorProps {
  menuItemId: number;
  basePrice: number;
  modifierGroups: ModifierGroup[];
  editCartItemId?: number | null;
  initialQuantity?: number | null;
  initialModifierIds?: number[] | null;
}

export default function ModifierSelector({
  menuItemId,
  basePrice,
  modifierGroups,
  editCartItemId,
  initialQuantity,
  initialModifierIds,
}: ModifierSelectorProps) {
  const isEditMode = !!editCartItemId;

  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<number, number[]>
  >(() => {
    const initial: Record<number, number[]> = {};
    modifierGroups.forEach((group) => {
      if (initialModifierIds && initialModifierIds.length > 0) {
        // Pre-select modifiers that belong to this group
        const groupModIds = group.modifiers.map((m) => m.id);
        initial[group.id] = initialModifierIds.filter((id) => groupModIds.includes(id));
      } else {
        initial[group.id] = [];
      }
    });
    return initial;
  });
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (
    groupId: number,
    modifierId: number,
    maxSelect: number
  ) => {
    setSelectedModifiers((prev) => {
      const current = prev[groupId] || [];
      if (maxSelect === 1) {
        // Radio behavior — toggle off if same, else select
        return {
          ...prev,
          [groupId]: current.includes(modifierId) ? [] : [modifierId],
        };
      }
      // Checkbox behavior
      if (current.includes(modifierId)) {
        return {
          ...prev,
          [groupId]: current.filter((id) => id !== modifierId),
        };
      }
      if (current.length >= maxSelect) return prev;
      return { ...prev, [groupId]: [...current, modifierId] };
    });
  };

  const allSelectedIds = useMemo(
    () => Object.values(selectedModifiers).flat(),
    [selectedModifiers]
  );

  const modifierTotal = useMemo(() => {
    let total = 0;
    modifierGroups.forEach((group) => {
      (selectedModifiers[group.id] || []).forEach((modId) => {
        const mod = group.modifiers.find((m) => m.id === modId);
        if (mod) total += mod.priceAdjustment;
      });
    });
    return total;
  }, [selectedModifiers, modifierGroups]);

  const totalPrice = (basePrice + modifierTotal) * quantity;

  // Validation — check required groups
  const isValid = modifierGroups.every((group) => {
    const selected = (selectedModifiers[group.id] || []).length;
    if (group.required && selected < group.minSelect) return false;
    return true;
  });

  const handleAddToCart = () => {
    if (!isValid || isPending) return;
    startTransition(async () => {
      try {
        // If editing, remove the old cart item first
        if (isEditMode && editCartItemId) {
          await removeFromCart(editCartItemId);
        }
        const result = await addToCart(menuItemId, quantity, allSelectedIds);
        if (result && "error" in result && result.error === "not_authenticated") {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        if (isEditMode) {
          router.push("/cart");
          return;
        }
        setAdded(true);
        setTimeout(() => setAdded(false), 2500);
      } catch {
        // Prevent button from getting stuck
      }
    });
  };

  return (
    <div className="space-y-6">
      {modifierGroups.map((group) => {
        const selectedCount = (selectedModifiers[group.id] || []).length;
        return (
          <div key={group.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h3 className="font-bold text-[#0f172b] dark:text-white">{group.name}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {group.required ? "Required" : "Optional"}
                  {group.maxSelect > 1 && ` · Select up to ${group.maxSelect}`}
                </p>
              </div>
              {group.required && selectedCount === 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-medium">
                  Required
                </span>
              )}
            </div>
            <div className="space-y-2">
              {group.modifiers.map((mod) => {
                const isSelected = (
                  selectedModifiers[group.id] || []
                ).includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    onClick={() =>
                      handleSelect(group.id, mod.id, group.maxSelect)
                    }
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200",
                      isSelected
                        ? "border-[#fea116] bg-[#fea116]/5"
                        : "border-transparent bg-white dark:bg-slate-700 hover:border-gray-200 dark:hover:border-slate-500"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                          isSelected
                            ? "border-[#fea116] bg-[#fea116]"
                            : "border-gray-300 dark:border-slate-500"
                        )}
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-sm text-[#0f172b] dark:text-white">
                        {mod.name}
                      </span>
                    </div>
                    {mod.priceAdjustment !== 0 && (
                      <span
                        className={cn(
                          "text-sm font-medium",
                          mod.priceAdjustment > 0
                            ? "text-[#fea116]"
                            : "text-green-600"
                        )}
                      >
                        {mod.priceAdjustment > 0 ? "+" : ""}
                        {formatPrice(mod.priceAdjustment)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quantity + Price + Add to Cart */}
      <div className="sticky bottom-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 bg-gray-100 dark:bg-slate-700 rounded-xl px-2 py-1">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-[#0f172b] dark:text-white"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-semibold text-[#0f172b] dark:text-white">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors text-[#0f172b] dark:text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={isPending || !isValid}
            className="flex-1 flex items-center justify-center gap-3 px-8 py-4 bg-[#fea116] text-[#0f172b] rounded-2xl font-bold text-lg hover:bg-[#f3c156] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : added ? (
              <>
                <Check className="w-5 h-5" /> Added! Tap to Add More
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                {isEditMode ? "Update Cart" : "Add to Cart"} &middot; {formatPrice(totalPrice)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
