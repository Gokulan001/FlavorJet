import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { redirect } from "next/navigation";
import { getCart, getUserAddress } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = {
  title: "Checkout | FlavorJet",
  description: "Review and place your order",
};

export default async function CheckoutPage() {
  // middleware handles redirect — getCart() handles auth internally
  const cartItems = await getCart();
  if (cartItems.length === 0) redirect("/cart");

  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const savedAddress = await getUserAddress();

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Header */}
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#fea116]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Checkout</h1>
              <p className="text-gray-400 text-sm">Review your order and delivery details</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#fea116] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Cart
        </Link>

        <div className="grid lg:grid-cols-5 gap-6 lg:gap-8">
          {/* Left: Order Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-20">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700">
                <h2 className="font-bold text-[#0f172b] dark:text-white text-lg">
                  Your Order ({cartItems.length} {cartItems.length === 1 ? "item" : "items"})
                </h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-4"
                  >
                    <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden">
                      <Image
                        src={item.itemImage}
                        alt={item.itemName}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#0f172b] dark:text-white text-sm line-clamp-1">
                        {item.itemName}
                      </h3>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {item.modifiers.map((m) => m.name).join(", ")}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs text-[#fea116] mt-0.5 line-clamp-1 italic">
                          &ldquo;{item.specialInstructions}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-[#0f172b] dark:text-white whitespace-nowrap text-sm">
                      {formatPrice(item.lineTotal)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Checkout Form */}
          <div className="lg:col-span-3">
            <CheckoutForm subtotal={subtotal} initialAddress={savedAddress} />
          </div>
        </div>
      </div>
    </div>
  );
}
