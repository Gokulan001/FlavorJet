"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AccessGateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/order-ai";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/access-gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 dark:bg-[#0b1120]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-3xl border border-gray-100 bg-gray-50 p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fea116]/10">
            <Lock className="h-6 w-6 text-[#fea116]" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            Access Required
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            This AI assistant demo is locked. Enter your access code to continue.
          </p>
        </div>

        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          autoFocus
          placeholder="Access code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-12 w-full rounded-full border border-gray-200 bg-white px-5 font-semibold text-gray-800 outline-none transition-colors focus:border-[#fea116] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !code.trim()}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#fea116] font-semibold uppercase text-white transition-colors hover:bg-[#f3c156] disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Unlock"}
        </button>
      </form>
    </div>
  );
}
