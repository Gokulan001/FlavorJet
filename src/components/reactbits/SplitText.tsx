"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  splitBy?: "chars" | "words";
  direction?: "up" | "down";
  threshold?: number;
}

export default function SplitText({
  text,
  className = "",
  delay = 30,
  splitBy = "chars",
  direction = "up",
  threshold = 0.2,
}: SplitTextProps) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(ref.current as Element);
        }
      },
      { threshold }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  const parts =
    splitBy === "words" ? text.split(" ") : text.split("");
  const yOffset = direction === "up" ? 40 : -40;

  return (
    <span ref={ref} className={`inline-flex flex-wrap overflow-hidden ${className}`}>
      {parts.map((char, i) => (
        <motion.span
          key={i}
          initial={{ y: yOffset, opacity: 0 }}
          animate={inView ? { y: 0, opacity: 1 } : { y: yOffset, opacity: 0 }}
          transition={{
            duration: 0.5,
            delay: (i * delay) / 1000,
            ease: [0.25, 0.1, 0.25, 1],
          }}
          style={{ display: "inline-block", willChange: "transform, opacity" }}
        >
          {char === " " ? "\u00A0" : char}
          {splitBy === "words" && i < parts.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </span>
  );
}
