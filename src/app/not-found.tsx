import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0b1120] px-4">
      <div className="text-center max-w-md">
        <h1 className="text-8xl font-bold text-[#fea116] mb-4">404</h1>
        <h2 className="text-2xl font-bold text-[#0f172b] dark:text-white mb-4">Page Not Found</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          Sorry, the page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#fea116] text-[#0f172b] rounded-full font-semibold hover:bg-[#f3c156] transition-colors"
          >
            <Home className="w-5 h-5" /> Go Home
          </Link>
          <Link
            href="/menu"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-full font-semibold hover:border-[#fea116] hover:text-[#fea116] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Browse Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
