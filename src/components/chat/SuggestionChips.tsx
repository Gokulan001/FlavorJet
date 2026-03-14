"use client";

import { motion } from "framer-motion";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const chip = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 },
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
      {suggestions.map((text) => (
        <motion.button
          key={text}
          variants={chip}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(text)}
          className="px-4 py-2 rounded-full text-xs font-medium
            text-[#fea116] border border-[#fea116]/40
            hover:bg-[#fea116]/10 hover:border-[#fea116]/60
            transition-colors duration-150"
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
}
