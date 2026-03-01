"use client";

import { useState } from "react";
import { Clock, Truck } from "lucide-react";
import AddressForm from "./AddressForm";
import TipSelector from "./TipSelector";
import PlaceOrderButton from "@/components/cart/PlaceOrderButton";

interface CheckoutFormProps {
  subtotal: number;
  initialAddress: {
    street: string | null;
    apartment: string | null;
    city: string | null;
    zipCode: string | null;
    phone: string | null;
  } | null;
}

export default function CheckoutForm({ subtotal, initialAddress }: CheckoutFormProps) {
  const [address, setAddress] = useState({
    street: initialAddress?.street ?? "",
    apartment: initialAddress?.apartment ?? "",
    city: initialAddress?.city ?? "",
    zipCode: initialAddress?.zipCode ?? "",
    phone: initialAddress?.phone ?? "",
  });
  const [tip, setTip] = useState(0);
  const [saveAddress, setSaveAddress] = useState(true);

  const fullAddress = [address.street, address.apartment, address.city, address.zipCode]
    .filter(Boolean)
    .join(", ");

  const total = subtotal + tip;

  return (
    <div className="space-y-6">
      {/* Address */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        <AddressForm
          initialAddress={initialAddress}
          onAddressChange={setAddress}
        />
        {address.street && (
          <label className="flex items-center gap-2 mt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAddress}
              onChange={(e) => setSaveAddress(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#fea116] focus:ring-[#fea116]"
            />
            <span className="text-sm text-gray-600 dark:text-slate-300">Save this address for next time</span>
          </label>
        )}
      </div>

      {/* Tip */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        <TipSelector subtotal={subtotal} onTipChange={setTip} />
      </div>

      {/* ETA */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#fea116]/10 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6 text-[#fea116]" />
          </div>
          <div>
            <h3 className="font-bold text-[#0f172b] dark:text-white">Estimated Delivery</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
              <span className="text-sm text-gray-600 dark:text-slate-300">25 – 45 minutes</span>
            </div>
          </div>
        </div>
      </div>

      {/* Updated Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
        <h2 className="font-bold text-[#0f172b] dark:text-white text-lg mb-4">Order Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Subtotal</span>
            <span>${(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-slate-400">Delivery</span>
            <span className="text-green-600 dark:text-green-400">Free</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-slate-400">Tip</span>
              <span>${(tip / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t dark:border-slate-600 pt-3 flex justify-between">
            <span className="font-bold text-[#0f172b] dark:text-white text-lg">Total</span>
            <span className="font-bold text-2xl text-[#fea116]">
              ${(total / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Place Order */}
      <PlaceOrderButton
        deliveryAddress={fullAddress || undefined}
        deliveryPhone={address.phone || undefined}
        tip={tip}
        saveAddress={saveAddress}
        addressData={address}
      />
    </div>
  );
}
