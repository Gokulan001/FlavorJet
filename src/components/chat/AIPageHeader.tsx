"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Trash2, Globe, MessageSquare, Mic } from "lucide-react";
import type { ChatMode, Language, VoiceState } from "./types";
import { LANGUAGES } from "./types";
import TokenBadge from "./TokenBadge";
import type { TokenUsage } from "./types";

interface AIPageHeaderProps {
  mode: ChatMode;
  onModeSwitch: (mode: ChatMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  voiceState: VoiceState;
  isLoading: boolean;
  isSpeaking: boolean;
  onClear: () => void;
  tokenUsage: TokenUsage;
  modelName: string;
  messageCount: number;
}

export default function AIPageHeader({
  mode, onModeSwitch, language, onLanguageChange,
  voiceState, isLoading, isSpeaking, onClear,
  tokenUsage, modelName, messageCount,
}: AIPageHeaderProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);

  const statusText = isLoading || voiceState === "processing"
    ? "Thinking..."
    : isSpeaking || voiceState === "speaking"
    ? "Speaking..."
    : voiceState === "listening"
    ? "Listening..."
    : "Online";

  const isActive = isLoading || voiceState !== "idle" || isSpeaking;
  const isCompressed = messageCount > 8;

  return (
    <div className="flex items-center justify-between px-5 py-3 bg-white/80 dark:bg-[#0f172b]/60 backdrop-blur-md border-b border-slate-200/60 dark:border-white/5">
      {/* Left: Avatar + Status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fea116]/30 to-[#fea116]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#fea116]" />
          </div>
          {isActive ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#fea116] border-2 border-white dark:border-[#0f172b] animate-pulse" />
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0f172b]" />
          )}
        </div>
        <div>
          <h3 className="text-slate-800 dark:text-white text-sm font-semibold leading-none">FlavorJet AI</h3>
          <p className={`text-[11px] mt-0.5 transition-colors ${
            isActive ? "text-[#fea116] font-medium" : "text-emerald-500 dark:text-emerald-400"
          }`}>
            {statusText}
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1">
        {/* Token Badge */}
        <TokenBadge usage={tokenUsage} model={modelName} />

        {/* Memory chip */}
        {messageCount > 0 && (
          <span className={`px-2 py-0.5 text-[10px] font-mono rounded-full border ${
            isCompressed
              ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50"
              : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50"
          }`}>
            {isCompressed ? `⟳ 8 kept` : `${messageCount} msgs`}
          </span>
        )}

        {/* Mode Switch */}
        <button
          onClick={() => onModeSwitch(mode === "chat" ? "voice" : "chat")}
          className={`p-2 rounded-lg transition-all ${
            mode === "voice"
              ? "text-[#fea116] bg-[#fea116]/10"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
          }`}
          title={mode === "voice" ? "Switch to Chat" : "Switch to Voice"}
        >
          {mode === "voice" ? <MessageSquare className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Language Picker */}
        <div className="relative">
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <Globe className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showLangPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute right-0 top-10 w-48 max-h-64 overflow-y-auto bg-white dark:bg-[#1a2332] rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 scrollbar-hide"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setShowLangPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors ${
                      language === lang.code ? "text-[#fea116]" : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          title="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
