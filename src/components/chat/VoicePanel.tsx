"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";
import VoiceOrb from "./VoiceOrb";
import OrderConfirmCard from "./OrderConfirmCard";
import ModifierPicker from "./ModifierPicker";
import type { VoiceState, OrderItem, PendingModifiers } from "./types";

interface VoicePanelProps {
  voiceState: VoiceState;
  transcript: string;
  lastResponse: string;
  analyserNode: AnalyserNode | null;
  onMicToggle: () => void;
  /** Reference to the TTS audio element for word-sync */
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  pendingOrder: OrderItem[] | null;
  onConfirmOrder: () => void;
  onCancelOrder: () => void;
  addingToCart: boolean;
  pendingModifiers: PendingModifiers | null;
  onModifierSelect: (groupName: string, modifierIds: number[]) => void;
  onModifierConfirm: () => void;
  onModifierCancel: () => void;
}

// ── Word-by-word highlight component ─────────────────────────────────────────
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
  const words = text.split(/(\s+)/); // Keep whitespace tokens for proper rendering
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estimate word timing based on audio progress
  useEffect(() => {
    if (!isSpeaking || !text) {
      setCurrentWordIndex(0);
      return;
    }

    // Count actual words (not whitespace tokens)
    const realWords = words.filter((w) => w.trim().length > 0);
    const totalWords = realWords.length;
    if (totalWords === 0) return;

    // ~150 wpm = ~2.5 words/second. Estimate total duration.
    const estimatedDuration = totalWords / 2.5;

    intervalRef.current = setInterval(() => {
      const audio = audioRef?.current;
      let progress = 0;

      if (audio && audio.duration > 0) {
        progress = audio.currentTime / audio.duration;
      } else {
        // Fallback: increment based on estimated speed
        setCurrentWordIndex((prev) => Math.min(prev + 1, totalWords));
        return;
      }

      const wordIdx = Math.floor(progress * totalWords);
      setCurrentWordIndex(Math.min(wordIdx, totalWords));
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isSpeaking, text, words, audioRef]);

  // Reset when text changes
  useEffect(() => {
    setCurrentWordIndex(0);
  }, [text]);

  if (!text) return null;

  // Track real word index through the tokens (which include whitespace)
  let realWordCount = 0;

  return (
    <p className="text-base leading-relaxed text-center">
      {words.map((token, i) => {
        if (token.trim().length === 0) {
          // Whitespace token
          return <span key={i}>{token}</span>;
        }
        const isRead = realWordCount < currentWordIndex;
        const isCurrent = realWordCount === currentWordIndex;
        realWordCount++;

        return (
          <span
            key={i}
            className={`transition-colors duration-150 ${
              isRead
                ? "text-white"
                : isCurrent && isSpeaking
                ? "text-[#fea116]"
                : "text-slate-500"
            }`}
          >
            {token}
          </span>
        );
      })}
    </p>
  );
}

// ── Status labels ────────────────────────────────────────────────────────────
const statusLabels: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Go ahead, I'm listening",
  processing: "Thinking...",
  speaking: "Speaking...",
};

export default function VoicePanel({
  voiceState, transcript, lastResponse, analyserNode, onMicToggle, audioRef,
  pendingOrder, onConfirmOrder, onCancelOrder, addingToCart,
  pendingModifiers, onModifierSelect, onModifierConfirm, onModifierCancel,
}: VoicePanelProps) {
  const isSpeaking = voiceState === "speaking";

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-5 py-4 overflow-y-auto bg-gradient-to-b from-[#0a0f1a] to-[#0f172b]">
      {/* Top status */}
      <AnimatePresence mode="wait">
        <motion.p
          key={voiceState}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          className={`text-xs font-medium tracking-wide mt-2 ${
            voiceState === "listening" ? "text-[#fea116]" :
            voiceState === "processing" ? "text-[#fea116]/70 animate-pulse" :
            voiceState === "speaking" ? "text-[#fea116]" :
            "text-slate-500"
          }`}
        >
          {statusLabels[voiceState]}
        </motion.p>
      </AnimatePresence>

      {/* Waveform + Text */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 w-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <VoiceOrb state={voiceState} analyserNode={analyserNode} size={200} />
        </motion.div>

        {/* Transcript / Response with word highlighting */}
        <div className="w-full max-w-[320px] min-h-[70px] px-2">
          <AnimatePresence mode="wait">
            {voiceState === "listening" && transcript && (
              <motion.p
                key="transcript"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-base text-white/80 italic text-center"
              >
                &ldquo;{transcript}&rdquo;
              </motion.p>
            )}
            {(voiceState === "speaking" || voiceState === "idle") && lastResponse && (
              <motion.div
                key="response"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-h-[120px] overflow-y-auto scrollbar-hide"
              >
                <HighlightedText
                  text={lastResponse}
                  audioRef={audioRef}
                  isSpeaking={isSpeaking}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modifier Picker */}
      {pendingModifiers && voiceState !== "processing" && (
        <div className="w-full mb-3">
          <ModifierPicker
            modifiers={pendingModifiers}
            onSelect={onModifierSelect}
            onConfirm={onModifierConfirm}
            onCancel={onModifierCancel}
          />
        </div>
      )}

      {/* Order Card */}
      {pendingOrder && !pendingModifiers && (
        <div className="w-full mb-3">
          <OrderConfirmCard
            items={pendingOrder}
            onConfirm={onConfirmOrder}
            onCancel={onCancelOrder}
            adding={addingToCart}
          />
        </div>
      )}

      {/* Mic Button */}
      <div className="flex flex-col items-center gap-3 mb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onMicToggle}
          disabled={voiceState === "processing" || voiceState === "speaking"}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            voiceState === "listening"
              ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
              : voiceState === "processing" || voiceState === "speaking"
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-gradient-to-br from-[#fea116] to-[#e89000] text-[#0f172b] shadow-lg shadow-[#fea116]/30"
          }`}
        >
          {voiceState === "listening" && (
            <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-30" />
          )}
          {voiceState === "processing" ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : voiceState === "listening" ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </motion.button>

        <p className="text-[10px] text-slate-600">
          {voiceState === "listening" ? "Tap to stop" : voiceState === "idle" ? "Tap to speak" : ""}
        </p>
      </div>
    </div>
  );
}
