"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mic, ArrowRight, MapPin, Shield } from "lucide-react";
import type { ChatMode } from "./types";

interface ChatOnboardingProps {
  onSelectMode: (mode: ChatMode) => void;
  userName?: string;
}

const CHAT_TIPS = [
  "\"Show me something spicy under $15\"",
  "Upload a food photo to find similar dishes",
  "Ask for nutrition details of any item",
  "\"What goes well with the ribeye steak?\"",
];

const VOICE_TIPS = [
  "\"I want two classic burgers and a coke\"",
  "\"What's good for this weather?\"",
  "Natural conversation — no commands needed",
  "I'll confirm before adding anything to cart",
];

export default function ChatOnboarding({ onSelectMode, userName }: ChatOnboardingProps) {
  const [selectedMode, setSelectedMode] = useState<ChatMode | null>(null);

  return (
    <div className="flex-1 flex flex-col px-5 py-6 overflow-y-auto">
      <AnimatePresence mode="wait">
        {!selectedMode ? (
          // ── Step 1: Mode Selection ──────────────────────────────────────
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col items-center justify-center gap-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-[#fea116] to-[#e89000] flex items-center justify-center shadow-lg shadow-[#fea116]/20"
              >
                <span className="text-2xl">✨</span>
              </motion.div>
              <h3 className="text-lg font-bold text-[#0f172b] dark:text-white">
                {userName ? `Hey ${userName}!` : "Welcome!"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-[260px]">
                How would you like to interact with your AI assistant?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Chat Mode Card */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedMode("chat")}
                className="group relative p-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-[#fea116] dark:hover:border-[#fea116] bg-white dark:bg-slate-800/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                </div>
                <h4 className="font-semibold text-sm text-[#0f172b] dark:text-white">Chat</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                  Type your orders & browse the menu
                </p>
              </motion.button>

              {/* Voice Mode Card */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedMode("voice")}
                className="group relative p-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700 hover:border-[#fea116] dark:hover:border-[#fea116] bg-white dark:bg-slate-800/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-[#fea116]/10 flex items-center justify-center mb-3">
                  <Mic className="w-5 h-5 text-[#fea116]" />
                </div>
                <h4 className="font-semibold text-sm text-[#0f172b] dark:text-white">Voice</h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-snug">
                  Speak naturally, order hands-free
                </p>
              </motion.button>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-[10px] text-gray-400 dark:text-slate-500 text-center"
            >
              You can switch modes anytime from the header
            </motion.p>
          </motion.div>
        ) : (
          // ── Step 2: Tips + Prerequisites ────────────────────────────────
          <motion.div
            key="tips"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col gap-5"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedMode === "voice" ? "bg-[#fea116]/10" : "bg-blue-50 dark:bg-blue-900/30"
              }`}>
                {selectedMode === "voice"
                  ? <Mic className="w-5 h-5 text-[#fea116]" />
                  : <MessageSquare className="w-5 h-5 text-blue-500" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#0f172b] dark:text-white">
                  {selectedMode === "voice" ? "Voice Mode" : "Chat Mode"}
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-slate-400">
                  Here&apos;s what you can do
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                Try saying
              </p>
              {(selectedMode === "voice" ? VOICE_TIPS : CHAT_TIPS).map((tip, i) => (
                <motion.div
                  key={tip}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-2.5 px-3 py-2 bg-gray-50 dark:bg-slate-800/50 rounded-xl"
                >
                  <span className="text-[#fea116] text-xs mt-0.5">→</span>
                  <span className="text-xs text-gray-600 dark:text-slate-300">{tip}</span>
                </motion.div>
              ))}
            </div>

            {/* Prerequisites */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                For the best experience
              </p>
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#fea116]/5 rounded-xl border border-[#fea116]/10">
                <MapPin className="w-3.5 h-3.5 text-[#fea116] flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-slate-300">
                  Allow location for weather-based suggestions
                </span>
              </div>
              {selectedMode === "voice" && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-[#fea116]/5 rounded-xl border border-[#fea116]/10">
                  <Shield className="w-3.5 h-3.5 text-[#fea116] flex-shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-slate-300">
                    Microphone access required for voice input
                  </span>
                </div>
              )}
            </div>

            {/* Back + Continue */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={() => setSelectedMode(null)}
                className="px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              >
                ← Back
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectMode(selectedMode)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#fea116] to-[#e89000] text-[#0f172b] rounded-xl text-sm font-bold shadow-md shadow-[#fea116]/20 hover:shadow-lg hover:shadow-[#fea116]/30 transition-shadow"
              >
                Let&apos;s Go
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
