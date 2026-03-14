"use client";

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 3,
  className = "",
}: ShinyTextProps) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(120deg, rgba(254,161,22,1) 40%, rgba(255,220,150,1) 50%, rgba(254,161,22,1) 60%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        animation: disabled ? "none" : `shinyText ${speed}s ease-in-out infinite`,
      }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes shinyText { 0%{background-position:100% 50%} 50%{background-position:0% 50%} 100%{background-position:100% 50%} }`,
        }}
      />
      {text}
    </span>
  );
}
