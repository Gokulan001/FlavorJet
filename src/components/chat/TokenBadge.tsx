"use client";

import { useState, useRef, useEffect } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TokenUsage } from "./types";

interface TokenBadgeProps {
  usage: TokenUsage;
  model: string;
}

export default function TokenBadge({ usage, model }: TokenBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [expanded]);

  if (usage.totalTokens === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-slate-600 dark:text-slate-400 hover:text-[#fea116] bg-slate-100 dark:bg-slate-900/50 rounded-full border border-slate-300 dark:border-slate-700/50 hover:border-[#fea116]/30 transition-colors"
      >
        <Zap className="w-3 h-3" />
        <span>{usage.totalTokens.toLocaleString()} tok</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            className="absolute  right-0 mb-2 w-48 p-3 bg-white dark:bg-[#0f172b] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl text-[10px] font-mono text-slate-700 dark:text-slate-300 space-y-1.5 z-50"
          >
            <div className="flex justify-between">
              <span className="text-slate-500">Model</span>
              <span className="text-[#fea116]">{model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Input</span>
              <span className="text-slate-800 dark:text-slate-300">{usage.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Output</span>
              <span className="text-slate-800 dark:text-slate-300">{usage.outputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tool calls</span>
              <span className="text-slate-800 dark:text-slate-300">{usage.toolCalls}</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Total</span>
              <span className="text-slate-900 dark:text-white">{usage.totalTokens.toLocaleString()}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
