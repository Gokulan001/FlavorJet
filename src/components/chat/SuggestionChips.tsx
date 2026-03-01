"use client";

import { motion } from "framer-motion";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const chip = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export default function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-wrap gap-2 px-1"
    >
      {suggestions.map((text, i) => (
        <motion.button
          key={text}
          variants={chip}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => onSelect(text)}
          className="px-3.5 py-1.5 text-xs font-medium rounded-full border border-[#fea116]/30 text-[#fea116] bg-[#fea116]/5 hover:bg-[#fea116]/10 dark:border-[#fea116]/20 dark:bg-[#fea116]/5 transition-colors"
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
}
