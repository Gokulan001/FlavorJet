"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, X, Minus, Trash2, Globe, MessageSquare, Mic,
} from "lucide-react";
import type { ChatMode, Language, VoiceState } from "./types";
import { LANGUAGES } from "./types";
import TokenBadge from "./TokenBadge";
import type { TokenUsage } from "./types";

interface ChatHeaderProps {
  mode: ChatMode;
  onModeSwitch: (mode: ChatMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  voiceState: VoiceState;
  isLoading: boolean;
  isSpeaking: boolean;
  onClear: () => void;
  onMinimize: () => void;
  onClose: () => void;
  tokenUsage: TokenUsage;
  modelName: string;
}

export default function ChatHeader({
  mode, onModeSwitch, language, onLanguageChange,
  voiceState, isLoading, isSpeaking, onClear, onMinimize, onClose,
  tokenUsage, modelName,
}: ChatHeaderProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);

  const statusText = isLoading || voiceState === "processing"
    ? "Thinking..."
    : isSpeaking || voiceState === "speaking"
    ? "Speaking..."
    : voiceState === "listening"
    ? "Listening..."
    : "Online";

  const isActive = isLoading || voiceState !== "idle" || isSpeaking;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0f172b] to-[#152035] border-b border-white/5">
      {/* Left: Avatar + Status */}
      <div className="flex items-center gap-2.5">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#fea116]/30 to-[#fea116]/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#fea116]" />
          </div>
          {/* Status ripple */}
          {isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#fea116] border-2 border-[#0f172b] animate-pulse" />
          )}
          {!isActive && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0f172b]" />
          )}
        </div>
        <div>
          <h3 className="text-white text-sm font-semibold leading-none">FlavorJet AI</h3>
          <p className={`text-[11px] mt-0.5 transition-colors ${
            isActive ? "text-[#fea116] font-medium" : "text-emerald-400"
          }`}>
            {statusText}
          </p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-0.5">
        {/* Token Badge */}
        {/* <TokenBadge usage={tokenUsage} model={modelName} /> */}

        {/* Mode Switch */}
        <button
          onClick={() => onModeSwitch(mode === "chat" ? "voice" : "chat")}
          className={`p-2 rounded-lg transition-all ${
            mode === "voice"
              ? "text-[#fea116] bg-[#fea116]/10"
              : "text-slate-400 hover:text-white hover:bg-white/10"
          }`}
          title={mode === "voice" ? "Switch to Chat" : "Switch to Voice"}
        >
          {mode === "voice" ? <MessageSquare className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Language Picker */}
        <div className="relative">
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <Globe className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showLangPicker && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.95 }}
                className="absolute right-0 top-10 w-48 max-h-64 overflow-y-auto bg-[#1a2332] rounded-xl border border-slate-700 shadow-xl z-50 scrollbar-hide"
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setShowLangPicker(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-white/10 transition-colors ${
                      language === lang.code ? "text-[#fea116]" : "text-slate-300"
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
        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Clear */}
        <button
          onClick={onClear}
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          title="Clear chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Minimize */}
        <button
          onClick={onMinimize}
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
