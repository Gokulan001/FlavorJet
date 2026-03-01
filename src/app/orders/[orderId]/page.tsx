import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, Package, ArrowLeft, Clock, MapPin, Phone } from "lucide-react";
import { getOrderById } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import OrderTimeline from "@/components/orders/OrderTimeline";
import ReorderButton from "@/components/orders/ReorderButton";

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { orderId } = await params;
  return { title: `Order #${orderId} | FlavorJet` };
}

export default async function OrderDetailPage({ params }: Props) {
  const { orderId } = await params;
  const order = await getOrderById(Number(orderId));
  if (!order) notFound();

  const isNew = order.status === "confirmed";

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Confirmation Banner */}
      {isNew && (
        <div className="bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 dark:text-green-300 mb-2">
              Order Confirmed!
            </h1>
            <p className="text-green-600 dark:text-green-400">
              Your order has been placed successfully. Thank you for choosing
              FlavorJet!
            </p>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-gray-500 dark:text-slate-400 hover:text-[#fea116] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> All Orders
        </Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#fea116]/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#fea116]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0f172b] dark:text-white">
                      Order #{order.id}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-4 py-1.5 rounded-full text-sm font-semibold capitalize bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  {order.status}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold text-[#0f172b] dark:text-white">Items Ordered</h3>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {order.items.map((item) => {
                  const lineTotal = item.unitPrice * item.quantity;
                  return (
                    <div key={item.id} className="p-4 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-[#0f172b] dark:text-white">
                            {item.itemName}
                          </h4>
                          {item.modifiers.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {item.modifiers.map((mod) => (
                                <p key={mod.id} className="text-xs text-gray-500 dark:text-slate-400">
                                  {mod.modifierName}
                                  {mod.priceAdjustment > 0 && (
                                    <span className="text-[#fea116] ml-1">
                                      +{formatPrice(mod.priceAdjustment)}
                                    </span>
                                  )}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <p className="text-xs text-[#fea116] mt-1 italic">
                              &ldquo;{item.specialInstructions}&rdquo;
                            </p>
                          )}
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            {formatPrice(item.unitPrice)} x {item.quantity}
                          </p>
                        </div>
                        <p className="font-bold text-[#0f172b] dark:text-white whitespace-nowrap">
                          {formatPrice(lineTotal)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total + Tip */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Subtotal</span>
                  <span>{formatPrice(order.total - (order.tip || 0))}</span>
                </div>
                {order.tip > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-slate-400">Tip</span>
                    <span>{formatPrice(order.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-slate-400">Delivery</span>
                  <span className="text-green-600 dark:text-green-400">Free</span>
                </div>
                <div className="border-t dark:border-slate-600 pt-3 flex justify-between items-center">
                  <span className="text-lg font-bold text-[#0f172b] dark:text-white">Total</span>
                  <span className="text-2xl font-bold text-[#fea116]">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Timeline */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
              <OrderTimeline
                status={order.status}
                estimatedMinutes={order.estimatedMinutes}
                createdAt={order.createdAt}
              />
            </div>

            {/* Delivery Info */}
            {order.deliveryAddress && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6 space-y-3">
                <h3 className="font-bold text-[#0f172b] dark:text-white">Delivery Details</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#fea116] mt-0.5 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-slate-300">{order.deliveryAddress}</p>
                </div>
                {order.deliveryPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-[#fea116] shrink-0" />
                    <p className="text-sm text-gray-600 dark:text-slate-300">{order.deliveryPhone}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <ReorderButton orderId={order.id} />
              <a
                href="/orders"
                className="flex items-center justify-center gap-2 py-3 border-2 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-xl font-semibold hover:border-[#fea116] hover:text-[#fea116] transition-colors no-underline"
              >
                View All Orders
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
