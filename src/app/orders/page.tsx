import Link from "next/link";
import { Package, ArrowRight, Clock } from "lucide-react";
import { getOrders } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";

export const metadata = {
  title: "Orders | FlavorJet",
  description: "Your order history",
};

export default async function OrdersPage() {
  const orders = await getOrders();

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Header */}
      <div className="bg-[#0f172b] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-[#fea116]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Orders</h1>
              <p className="text-gray-400 text-sm">
                {orders.length} order{orders.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-400 dark:text-slate-500 mb-2">
              No orders yet
            </h2>
            <p className="text-gray-400 dark:text-slate-500 mb-6">
              Start ordering from our delicious menu!
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-colors"
            >
              Browse Menu <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusColor =
                {
                  confirmed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
                  preparing: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
                  ready: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
                  completed: "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300",
                  cancelled: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
                  pending: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
                }[order.status] || "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300";

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#fea116]/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 sm:w-6 sm:h-6 text-[#fea116]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#0f172b] dark:text-white text-sm sm:text-base">
                          Order #{order.id}
                        </h3>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                          <span className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-[#fea116] text-base sm:text-lg">
                          {formatPrice(order.total)}
                        </p>
                        <span
                          className={`inline-block px-2 sm:px-3 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 group-hover:text-[#fea116] group-hover:translate-x-1 transition-all hidden sm:block" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
