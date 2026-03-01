"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0b1120] px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#0f172b] dark:text-white mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          An unexpected error occurred. Please try again or go back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-colors"
          >
            <RefreshCw className="w-5 h-5" /> Try Again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-full font-semibold hover:border-[#fea116] hover:text-[#fea116] transition-colors"
          >
            <Home className="w-5 h-5" /> Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
