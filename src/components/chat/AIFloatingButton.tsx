"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export default function AIFloatingButton() {
  const pathname = usePathname();
  const hidden = pathname === "/order-ai";

  return (
    <Link
      href="/order-ai"
      aria-label="Order with AI"
      className={`fixed bottom-12 right-12 z-50 transition-opacity duration-300 ${hidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
    >
      <div className="widget-float relative flex h-14 w-14 items-center justify-center">
        {/* Ripple rings — pure CSS, immune to React re-renders */}
        <span className="widget-ripple absolute inset-0 rounded-full bg-[#fea116]" />
        <span className="widget-ripple absolute inset-0 rounded-full bg-[#fea116]" style={{ animationDelay: "1.1s" }} />

        {/* Button face */}
        <div className="relative z-10 h-14 w-14 rounded-full overflow-hidden shadow-lg ring-2 ring-[#fea116]/40 transition-transform duration-200 hover:scale-110 hover:shadow-[0_0_40px_10px_rgba(254,161,22,0.55)]">
          <Image
            src="/ai-avatar.png"
            alt="FlavorJet AI"
            fill
            className="object-cover"
          />
        </div>
      </div>
    </Link>
  );
}
