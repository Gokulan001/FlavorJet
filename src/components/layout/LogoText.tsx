"use client";

interface LogoTextProps {
  showPill: boolean;
  size: "sm" | "md";
}

export default function LogoText({ showPill, size }: LogoTextProps) {
  return (
    <span
      className={`font-[var(--font-space-grotesk)] font-bold tracking-tight transition-all duration-300 ${
        size === "sm" ? "text-lg" : "text-2xl"
      } ${
        showPill
          ? "text-white"
          : "text-gray-900 dark:text-white"
      }`}
    >
      Flavor
      <span className="text-orange-500">Jet</span>
    </span>
  );
}
