import Image from "next/image";
import Link from "next/link";
import { User, Mail, Calendar, Package, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/actions/auth-actions";
import { getOrders } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import ProfileAddressForm from "@/components/profile/ProfileAddressForm";

export const metadata = {
  title: "My Profile | FlavorJet",
  description: "Manage your account and delivery details",
};

export default async function ProfilePage() {
  // middleware redirects unauthenticated users
  const profile = await getUserProfile();
  if (!profile) redirect("/login");

  const orders = await getOrders();
  const recentOrders = orders.slice(0, 5);
  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#0b1120]">
      {/* Header */}
      <div className="bg-[#0f172b] text-white py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-[#fea116]/30">
              {profile.profilePicture ? (
                <Image
                  src={profile.profilePicture}
                  alt={profile.username}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="w-full h-full bg-[#fea116]/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-[#fea116]" />
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">{profile.username}</h1>
              <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
                <Mail className="w-4 h-4" /> {profile.email}
              </p>
              <p className="text-gray-500 text-xs flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats */}
          <div className="lg:col-span-3 grid sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-[#fea116]">{orders.length}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Total Orders</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-[#fea116]">{formatPrice(totalSpent)}</p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Total Spent</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-5 text-center">
              <p className="text-3xl font-bold text-[#fea116]">
                {orders.length > 0
                  ? formatPrice(Math.round(totalSpent / orders.length))
                  : "$0.00"}
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Avg. Order</p>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm p-4 sm:p-6">
              <ProfileAddressForm
                initialAddress={{
                  street: profile.street,
                  apartment: profile.apartment,
                  city: profile.city,
                  zipCode: profile.zipCode,
                  phone: profile.phone,
                }}
              />
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="font-bold text-[#0f172b] dark:text-white">Recent Orders</h3>
              </div>
              {recentOrders.length === 0 ? (
                <div className="p-6 text-center">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 dark:text-slate-500">No orders yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-slate-700">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-[#0f172b] dark:text-white text-sm">
                          Order #{order.id}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#fea116] text-sm">
                          {formatPrice(order.total)}
                        </span>
                        <ArrowRight className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {orders.length > 5 && (
                <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                  <Link
                    href="/orders"
                    className="flex items-center justify-center gap-2 text-sm text-[#fea116] font-semibold hover:underline"
                  >
                    View All Orders <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
