"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, ShoppingCart } from "lucide-react";
import SineWave from "./SineWave";
import type { VoiceState } from "./types";

// Theme detection hook
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

interface VoicePanelProps {
  voiceState: VoiceState;
  transcript: string;
  lastResponse: string;
  analyserNode: AnalyserNode | null;
  onMicToggle: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  cartCount?: number;
  cartTotal?: string;
  onCheckout?: () => void;
}

// ── Word-by-word highlight ───────────────────────────────────────────────────

function HighlightedText({
  text,
  audioRef,
  isSpeaking,
}: {
  text: string;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  isSpeaking: boolean;
}) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const words = text.split(/(\s+)/);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isSpeaking || !text) {
      setCurrentWordIndex(0);
      return;
    }

    const realWords = words.filter((w) => w.trim().length > 0);
    const totalWords = realWords.length;
    if (totalWords === 0) return;

    intervalRef.current = setInterval(() => {
      const audio = audioRef?.current;
      if (audio && audio.duration > 0) {
        const progress = audio.currentTime / audio.duration;
        setCurrentWordIndex(Math.min(Math.floor(progress * totalWords), totalWords));
      } else {
        setCurrentWordIndex((prev) => Math.min(prev + 1, totalWords));
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSpeaking, text, words, audioRef]);

  useEffect(() => {
    setCurrentWordIndex(0);
  }, [text]);

  if (!text) return null;

  let realWordCount = 0;

  return (
    <p className="text-lg leading-relaxed text-center font-light">
      {words.map((token, i) => {
        if (token.trim().length === 0) return <span key={i}>{token}</span>;
        const isRead = realWordCount < currentWordIndex;
        const isCurrent = realWordCount === currentWordIndex;
        realWordCount++;
        return (
          <span
            key={i}
            className={`transition-colors duration-150 ${
              isRead
                ? "text-white/90"
                : isCurrent && isSpeaking
                ? "text-[#fea116]"
                : "text-white/35"
            }`}
          >
            {token}
          </span>
        );
      })}
    </p>
  );
}

// ── State config ─────────────────────────────────────────────────────────────

const STATE_CONFIG: Record<VoiceState, { label: string; color: string; pulse: boolean }> = {
  idle:       { label: "Tap to speak",           color: "text-white/40",          pulse: false },
  listening:  { label: "Listening...",            color: "text-[#fea116]",         pulse: true  },
  processing: { label: "Thinking...",             color: "text-[#fea116]/70",      pulse: true  },
  speaking:   { label: "Speaking...",             color: "text-[#fea116]",         pulse: false },
};

// ── VoicePanel ───────────────────────────────────────────────────────────────

export default function VoicePanel({
  voiceState,
  transcript,
  lastResponse,
  analyserNode,
  onMicToggle,
  audioRef,
  cartCount = 0,
  cartTotal = "$0.00",
  onCheckout,
}: VoicePanelProps) {
  const isSpeaking = voiceState === "speaking";
  const cfg = STATE_CONFIG[voiceState];
  const isDark = useIsDarkMode();

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* ── Stage area (theme-aware) ───────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-h-0"
        style={{
          background: isDark
            ? "radial-gradient(ellipse at 50% 40%, #1a0e02 0%, #0a0812 45%, #02050f 100%)"
            : "radial-gradient(ellipse at 50% 40%, #f5f0eb 0%, #ede5dd 50%, #e8dfd3 100%)",
        }}
      >
        {/* Status indicator only (no text) */}
        <div className="flex-shrink-0 flex justify-center pt-5 pb-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={voiceState}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`w-2 h-2 rounded-full border ${
                voiceState === "idle"
                  ? "bg-white/25 border-white/15"
                  : "bg-[#fea116] border-[#fea116]"
              } ${cfg.pulse ? "animate-pulse" : ""}`}
            />
          </AnimatePresence>
        </div>

        {/* Conversation area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3 min-h-0">
          {/* AI response with word highlight */}
          <AnimatePresence mode="wait">
            {(voiceState === "speaking" || (voiceState === "idle" && lastResponse)) && lastResponse && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full max-w-lg max-h-[120px] overflow-y-auto scrollbar-hide"
              >
                <HighlightedText
                  text={lastResponse}
                  audioRef={audioRef}
                  isSpeaking={isSpeaking}
                />
              </motion.div>
            )}

            {voiceState === "listening" && transcript && (
              <motion.div
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full max-w-lg"
              >
                <p className="text-base text-white/60 italic text-center leading-relaxed">
                  &ldquo;{transcript}&rdquo;
                </p>
              </motion.div>
            )}

            {voiceState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#fea116]/60"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Wave — full width, massive ───────────────────────────────── */}
        <div className="flex-shrink-0 w-full overflow-hidden">
          <SineWave state={voiceState} analyserNode={analyserNode} height={220} />
        </div>

        {/* ── Mic button ───────────────────────────────────────────────── */}
        <div className="flex-shrink-0 flex flex-col items-center gap-3 py-6 px-4">
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            onClick={onMicToggle}
            disabled={voiceState === "processing" || voiceState === "speaking"}
            className={`relative w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all ${
              voiceState === "listening"
                ? "bg-red-500 text-white shadow-2xl shadow-red-500/40"
                : voiceState === "processing" || voiceState === "speaking"
                ? "bg-white/8 text-white/30 cursor-not-allowed border border-white/10"
                : "bg-gradient-to-br from-[#fea116] to-[#d97706] text-slate-900 shadow-2xl shadow-[#fea116]/35"
            }`}
          >
            {/* Listening ring pulse */}
            {voiceState === "listening" && (
              <>
                <span className="absolute inset-0 rounded-full border-2 border-red-400/60 animate-ping" />
                <span className="absolute -inset-3 rounded-full border border-red-400/20 animate-ping" style={{ animationDelay: "0.15s" }} />
              </>
            )}
            {/* Idle glow ring */}
            {voiceState === "idle" && (
              <span className="absolute -inset-1.5 rounded-full bg-[#fea116]/15 blur-sm" />
            )}

            {voiceState === "processing" ? (
              <Loader2 className="w-7 h-7 animate-spin" />
            ) : voiceState === "listening" ? (
              <MicOff className="w-7 h-7" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </motion.button>

          <p className={`text-xs tracking-wide leading-snug text-center max-w-xs font-light ${
            isDark ? "text-white/50" : "text-slate-600"
          }`}>
            Tap on the mic to speak and tap again to stop the recording
          </p>
        </div>
      </div>

      {/* ── Cart peek strip ──────────────────────────────────────────────── */}
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex-shrink-0 flex items-center justify-between px-5 py-3.5"
          style={{ background: "rgba(10,8,20,0.95)", borderTop: "1px solid rgba(254,161,22,0.15)" }}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingCart className="w-4 h-4 text-[#fea116]" />
            <span className="text-sm text-white/70">
              <span className="text-white font-medium">{cartCount}</span>
              {" "}item{cartCount !== 1 ? "s" : ""}&nbsp;·&nbsp;
              <span className="text-[#fea116] font-semibold">{cartTotal}</span>
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onCheckout}
            className="px-4 py-1.5 rounded-xl bg-[#fea116] text-slate-900 text-xs font-bold"
          >
            Checkout
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
