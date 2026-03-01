"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Minus, Plus, Check, Loader2 } from "lucide-react";
import { addToCart } from "@/actions/cart-actions";
import { useToast } from "@/components/ui/ToastProvider";

interface AddToCartButtonProps {
  menuItemId: number;
}

export default function AddToCartButton({ menuItemId }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleAddToCart = () => {
    startTransition(async () => {
      const result = await addToCart(menuItemId, quantity);
      if (result && "error" in result && result.error === "not_authenticated") {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      if (result && "error" in result) {
        toast(result.error as string, "error");
        return;
      }
      setAdded(true);
      toast(`Added ${quantity} item${quantity > 1 ? "s" : ""} to cart!`, "success");
      setTimeout(() => setAdded(false), 2500);
    });
  };

  return (
    <div className="space-y-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600">Quantity:</span>
        <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-2 py-1">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-8 text-center font-semibold">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        disabled={isPending}
        className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#fea116] text-[#0f172b] rounded-2xl font-bold text-lg hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25 disabled:opacity-70"
      >
        {isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : added ? (
          <>
            <Check className="w-5 h-5" /> Added! Tap to Add More
          </>
        ) : (
          <>
            <ShoppingCart className="w-5 h-5" /> Add to Cart
          </>
        )}
      </button>
    </div>
  );
}
