"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Clock, ChefHat, Package, Truck } from "lucide-react";

interface OrderTimelineProps {
  status: string;
  estimatedMinutes: number;
  createdAt: string;
}

const steps = [
  { key: "confirmed", label: "Order Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready for Pickup", icon: Package },
  { key: "completed", label: "Delivered", icon: Truck },
];

const statusOrder = ["confirmed", "preparing", "ready", "completed"];

export default function OrderTimeline({ status, estimatedMinutes, createdAt }: OrderTimelineProps) {
  const currentIndex = statusOrder.indexOf(status);
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";

  const orderTime = new Date(createdAt).getTime();
  const etaTime = orderTime + estimatedMinutes * 60 * 1000;

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (isCompleted || isCancelled) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isCompleted, isCancelled]);

  const msLeft = Math.max(0, etaTime - now);
  const minutesLeft = Math.floor(msLeft / 60000);
  const secondsLeft = Math.floor((msLeft % 60000) / 1000);
  const totalMs = estimatedMinutes * 60 * 1000;
  const progress = Math.min(100, ((totalMs - msLeft) / totalMs) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0f172b]">Order Status</h3>
        {!isCancelled && !isCompleted && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-[#fea116]" />
            <span className="text-gray-600 tabular-nums">
              {msLeft > 0
                ? `${minutesLeft}:${String(secondsLeft).padStart(2, "0")} left`
                : "Arriving soon"}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isCancelled && !isCompleted && (
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#fea116] rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isCancelled ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-500 text-lg font-bold">&times;</span>
          </div>
          <p className="text-sm font-medium text-red-700">This order has been cancelled</p>
        </div>
      ) : (
        <div className="relative">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.key} className="flex items-start gap-4 relative">
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-[19px] top-10 w-0.5 h-8 ${
                      index < currentIndex ? "bg-[#fea116]" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isCurrent
                      ? "bg-[#fea116] text-white shadow-md shadow-[#fea116]/30"
                      : isActive
                        ? "bg-[#fea116]/20 text-[#fea116]"
                        : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`pb-8 ${index === steps.length - 1 ? "pb-0" : ""}`}>
                  <p className={`text-sm font-semibold ${isActive ? "text-[#0f172b]" : "text-gray-400"}`}>
                    {step.label}
                  </p>
                  {isCurrent && !isCompleted && (
                    <p className="text-xs text-[#fea116] mt-0.5">In progress</p>
                  )}
                  {isCompleted && index === steps.length - 1 && (
                    <p className="text-xs text-green-600 mt-0.5">Delivered</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
