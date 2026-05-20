"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { placeOrderFromAI, getUserAddress } from "@/actions/cart-actions";
import type { CartContext } from "./types";
import { useEffect } from "react";

interface CheckoutModalProps {
  cart?: CartContext | null;
  onClose: () => void;
  onOrderPlaced?: () => void;
}

type CheckoutState = "form" | "placing" | "success";

export default function CheckoutModal({ cart, onClose, onOrderPlaced }: CheckoutModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CheckoutState>("form");
  const [savedAddress, setSavedAddress] = useState<string>("");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");

  useEffect(() => {
    getUserAddress().then((addr) => {
      if (addr?.street) {
        const formatted = `${addr.street}${addr.apartment ? `, ${addr.apartment}` : ""}, ${addr.city} ${addr.zipCode}`;
        setSavedAddress(formatted);
      }
    });
  }, []);

  const selectedTip = customTip ? parseFloat(customTip) || 0 : tip;
  const tipDisplay = selectedTip > 0 ? `$${selectedTip.toFixed(2)}` : "$0.00";

  const handlePlaceOrder = () => {
    setState("placing");
    startTransition(async () => {
      const result = await placeOrderFromAI();
      if (!result || "error" in result) {
        setState("form");
        return;
      }
      setState("success");
      const { orderId } = result as { orderId: number; estimatedMinutes: number };
      setTimeout(() => {
        onOrderPlaced?.();
        router.push(`/orders/${orderId}`);
      }, 2000);
    });
  };

  // Success overlay
  if (state === "success") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-500/95 backdrop-blur-sm">
        <div className="text-center text-white px-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="mb-5 text-7xl"
          >
            ✓
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-2 text-3xl font-bold"
          >
            Order Placed!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-emerald-100"
          >
            Redirecting to your order...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-700">
          <h2 className="text-lg font-semibold">Confirm Order</h2>
          <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>

        {/* Cart summary */}
        <div className="max-h-48 overflow-y-auto p-4">
          <ul className="space-y-2">
            {(cart?.items ?? []).map((item, i) => (
              <li key={`${item.slug}-${i}`} className="flex justify-between text-sm">
                <span>
                  {item.qty}x {item.name}
                </span>
                <span className="font-medium">{item.price}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Address */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-1 text-xs font-medium text-slate-500">Deliver to</p>
          {savedAddress ? (
            <p className="text-sm">{savedAddress}</p>
          ) : (
            <p className="text-sm text-slate-400">No saved address</p>
          )}
        </div>

        {/* Tip */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <p className="mb-2 text-xs font-medium text-slate-500">Add a tip</p>
          <div className="flex gap-2">
            {[0, 2, 5].map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setTip(amount);
                  setCustomTip("");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  tip === amount && !customTip
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {amount === 0 ? "None" : `$${amount}`}
              </button>
            ))}
            <input
              type="number"
              placeholder="Custom"
              value={customTip}
              onChange={(e) => {
                setCustomTip(e.target.value);
                setTip(0);
              }}
              className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Total + Place Order */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-1 flex justify-between text-sm text-slate-500">
            <span>Subtotal</span>
            <span>{cart?.total ?? "$0.00"}</span>
          </div>
          <div className="mb-3 flex justify-between text-sm text-slate-500">
            <span>Tip</span>
            <span>{tipDisplay}</span>
          </div>
          <div className="mb-4 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{cart?.total ?? "$0.00"}</span>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={isPending || state === "placing"}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {state === "placing" ? "Placing Order..." : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
