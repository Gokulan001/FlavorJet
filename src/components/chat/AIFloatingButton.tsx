"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AIFloatingButton() {
  const pathname = usePathname();

  // Hide on the AI page itself
  if (pathname === "/order-ai") return null;

  return (
    <Link
      href="/order-ai"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      aria-label="Order with AI"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-6 w-6"
      >
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a2 2 0 0 1-2 2h-1v5a4 4 0 0 1-4 4h-2a4 4 0 0 1-4-4v-5H6a2 2 0 0 1-2-2v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
        <circle cx="10" cy="13" r="1" />
        <circle cx="14" cy="13" r="1" />
      </svg>
    </Link>
  );
}
