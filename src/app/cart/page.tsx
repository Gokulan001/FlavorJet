import Link from "next/link";
import { ShoppingCart, ArrowLeft, ArrowRight } from "lucide-react";
import { getCart } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import { getRecommendations } from "@/lib/recommendations";
import CartItemCard from "@/components/cart/CartItemCard";
import CartRecommendations from "@/components/cart/CartRecommendations";

export const metadata = {
  title: "Cart | FlavorJet",
  description: "Your shopping cart",
};

export default async function CartPage() {
  // middleware handles redirect for unauthenticated users
  // getCart() handles auth internally — no extra verifyAuth() needed
  const cartItems = await getCart();
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Get recommendations based on cart categories
  const cartCategoryIds = [...new Set(cartItems.map((item) => item.categoryId))];
  const cartMenuItemIds = cartItems.map((item) => item.menuItemId);
  const recommendations = getRecommendations(cartCategoryIds, cartMenuItemIds);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Header */}
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-[#fea116]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Cart</h1>
              <p className="text-gray-400 text-sm">
                {itemCount} item{itemCount !== 1 ? "s" : ""} in your cart
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-400 dark:text-slate-500 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-400 dark:text-slate-500 mb-6">
              Browse our menu and add some delicious items!
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-colors"
            >
              Browse Menu <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 pb-24 lg:pb-0">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <CartItemCard key={item.id} item={item} />
                ))}

                {/* Recommendations */}
                {recommendations.length > 0 && (
                  <CartRecommendations items={recommendations} />
                )}

                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#fea116] transition-colors mt-4"
                >
                  <ArrowLeft className="w-4 h-4" /> Continue Shopping
                </Link>
              </div>

              {/* Order Summary — desktop */}
              <div className="hidden lg:block lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm sticky top-20">
                  <h2 className="text-lg font-bold text-[#0f172b] dark:text-white mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">
                        Subtotal ({itemCount} items)
                      </span>
                      <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-slate-400">Delivery</span>
                      <span className="font-medium text-green-600 dark:text-green-400">Free</span>
                    </div>
                    <div className="border-t dark:border-slate-600 pt-3 flex justify-between">
                      <span className="font-bold text-[#0f172b] dark:text-white">Total</span>
                      <span className="font-bold text-xl text-[#fea116]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/checkout"
                    className="w-full flex items-center justify-center gap-2 py-4 bg-[#fea116] text-[#0f172b] rounded-2xl font-bold text-lg hover:bg-[#f3c156] transition-all duration-300 hover:shadow-lg hover:shadow-[#fea116]/25"
                  >
                    Proceed to Checkout <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Mobile sticky checkout bar */}
            <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
                <div>
                  <p className="text-xs text-gray-500 dark:text-slate-400">{itemCount} items</p>
                  <p className="text-lg font-bold text-[#fea116]">{formatPrice(subtotal)}</p>
                </div>
                <Link
                  href="/checkout"
                  className="flex-1 max-w-xs flex items-center justify-center gap-2 py-3.5 bg-[#fea116] text-[#0f172b] rounded-xl font-bold hover:bg-[#f3c156] transition-colors"
                >
                  Checkout <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
