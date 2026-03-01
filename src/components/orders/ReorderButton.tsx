"use client";

import { useTransition } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { reorderFromOrder } from "@/actions/cart-actions";

interface ReorderButtonProps {
  orderId: number;
}

export default function ReorderButton({ orderId }: ReorderButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleReorder = () => {
    startTransition(async () => {
      await reorderFromOrder(orderId);
    });
  };

  return (
    <button
      onClick={handleReorder}
      disabled={isPending}
      className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#fea116] text-[#0f172b] rounded-xl font-semibold hover:bg-[#f3c156] transition-colors disabled:opacity-70"
    >
      {isPending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" /> Adding to Cart...
        </>
      ) : (
        <>
          <RefreshCw className="w-5 h-5" /> Reorder
        </>
      )}
    </button>
  );
}
