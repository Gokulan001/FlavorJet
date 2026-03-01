"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { quickAddToCart } from "@/actions/cart-actions";
import { useToast } from "@/components/ui/ToastProvider";

interface QuickAddButtonProps {
  menuItemId: number;
}

export default function QuickAddButton({ menuItemId }: QuickAddButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleClick = () => {
    startTransition(async () => {
      const result = await quickAddToCart(menuItemId);
      if (result && "error" in result && result.error === "not_authenticated") {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }
      if (result && "error" in result) {
        toast(result.error as string, "error");
        return;
      }
      setAdded(true);
      toast("Added to cart!", "success");
      setTimeout(() => setAdded(false), 2000);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 px-4 py-2 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold text-sm hover:bg-[#f3c156] transition-all duration-300 disabled:opacity-70"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : added ? (
        <>
          <Check className="w-4 h-4" /> Added!
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" /> Add
        </>
      )}
    </button>
  );
}
