"use client";

import { useRef, useEffect, useState } from "react";
import { useInView, animate } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  suffix?: string;
}

export default function AnimatedCounter({ target, duration = 1.5, suffix = "" }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated && ref.current) {
      setHasAnimated(true);
      const controls = animate(0, target, {
        duration,
        ease: "easeOut",
        onUpdate(value) {
          if (ref.current) {
            ref.current.textContent = `${Math.round(value)}${suffix}`;
          }
        },
      });
      return () => controls.stop();
    }
  }, [isInView, hasAnimated, target, duration, suffix]);

  return <span ref={ref}>0{suffix}</span>;
}
