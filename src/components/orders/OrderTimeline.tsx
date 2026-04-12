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

/** Derive a visual status from elapsed time so the UI progresses even without backend updates.
 *  Thresholds (fraction of ETA):
 *    0–25%   → confirmed
 *    25–75%  → preparing
 *    75–100% → ready
 *    100%+   → completed
 */
function deriveStatus(dbStatus: string, orderTime: number, etaMs: number, now: number): string {
  if (dbStatus === "cancelled" || dbStatus === "completed") return dbStatus;
  const elapsed = now - orderTime;
  if (elapsed >= etaMs) return "completed";
  const pct = elapsed / etaMs;
  if (pct >= 0.75) return "ready";
  if (pct >= 0.25) return "preparing";
  return "confirmed";
}

export default function OrderTimeline({ status, estimatedMinutes, createdAt }: OrderTimelineProps) {
  // Hydration fix: render "0" on server, real time on client
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  const orderTime = new Date(createdAt).getTime();
  const etaMs = estimatedMinutes * 60 * 1000;
  const etaTime = orderTime + etaMs;

  const isCancelled = status === "cancelled";
  const isDbCompleted = status === "completed";

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (isDbCompleted || isCancelled) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [isDbCompleted, isCancelled]);

  // Derive visual status from time progression
  const effectiveStatus = mounted
    ? deriveStatus(status, orderTime, etaMs, now)
    : status;
  const currentIndex = statusOrder.indexOf(effectiveStatus);
  const isCompleted = effectiveStatus === "completed";

  const msLeft = mounted ? Math.max(0, etaTime - now) : etaMs;
  const minutesLeft = Math.floor(msLeft / 60000);
  const secondsLeft = Math.floor((msLeft % 60000) / 1000);
  const progress = mounted
    ? Math.min(100, ((etaMs - msLeft) / etaMs) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-[#0f172b] dark:text-white">Order Status</h3>
        {!isCancelled && !isCompleted && mounted && (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="w-4 h-4 text-[#fea116]" />
            <span className="text-gray-600 dark:text-slate-400 tabular-nums">
              {msLeft > 0
                ? `${minutesLeft}:${String(secondsLeft).padStart(2, "0")} left`
                : "Arriving soon"}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!isCancelled && !isCompleted && mounted && (
        <div className="w-full h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#fea116] rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isCancelled ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <span className="text-red-500 text-lg font-bold">&times;</span>
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">This order has been cancelled</p>
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
                      index < currentIndex ? "bg-[#fea116]" : "bg-gray-200 dark:bg-slate-600"
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isCurrent
                      ? "bg-[#fea116] text-white shadow-md shadow-[#fea116]/30"
                      : isActive
                        ? "bg-[#fea116]/20 text-[#fea116]"
                        : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`pb-8 ${index === steps.length - 1 ? "pb-0" : ""}`}>
                  <p className={`text-sm font-semibold ${isActive ? "text-[#0f172b] dark:text-white" : "text-gray-400 dark:text-slate-500"}`}>
                    {step.label}
                  </p>
                  {isCurrent && !isCompleted && (
                    <p className="text-xs text-[#fea116] mt-0.5">In progress</p>
                  )}
                  {isCompleted && index === steps.length - 1 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Delivered</p>
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
