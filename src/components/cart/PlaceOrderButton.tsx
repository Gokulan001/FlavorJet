"use client";

import { useTransition } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { placeOrder, saveUserAddress } from "@/actions/cart-actions";

interface PlaceOrderButtonProps {
  deliveryAddress?: string;
  deliveryPhone?: string;
  tip?: number;
  saveAddress?: boolean;
  addressData?: { street: string; apartment: string; city: string; zipCode: string; phone: string };
}

export default function PlaceOrderButton({
  deliveryAddress,
  deliveryPhone,
  tip,
  saveAddress,
  addressData,
}: PlaceOrderButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handlePlaceOrder = () => {
    startTransition(async () => {
      if (saveAddress && addressData && addressData.street) {
        await saveUserAddress(addressData);
      }
      await placeOrder(deliveryAddress, deliveryPhone, tip);
    });
  };

  return (
    <button
      onClick={handlePlaceOrder}
      disabled={isPending}
      className="w-full flex items-center justify-center gap-3 py-4 bg-[#fea116] text-[#0f172b] rounded-2xl font-bold text-lg hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25 disabled:opacity-70"
    >
      {isPending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" /> Processing...
        </>
      ) : (
        <>
          <CheckCircle className="w-5 h-5" /> Place Order
        </>
      )}
    </button>
  );
}
