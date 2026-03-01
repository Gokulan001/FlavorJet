"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronDown } from "lucide-react";
import { addToCart } from "@/actions/cart-actions";

import ChatHeader from "./ChatHeader";
import ChatOnboarding from "./ChatOnboarding";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import VoicePanel from "./VoicePanel";
import {
  type ChatMode, type Language, type VoiceState, type WeatherData,
  type TokenUsage, type OrderItem, type PendingModifiers,
  getMessageText, makeUIMessage, extractItemIds, extractModifiers, cleanMarkers,
  STORAGE_KEYS,
} from "./types";

// ── Default suggestions per context ─────────────────────────────────────────
const WELCOME_SUGGESTIONS = [
  "What's popular?",
  "Show me burgers",
  "Something under $12",
  "Recommend for me",
];

// ── Component ────────────────────────────────────────────────────────────────
export default function ChatWidget({ user }: { user: { username: string } | null }) {
  const router = useRouter();

  // ── Core State ──────────────────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [mode, setMode] = useState<ChatMode>("chat");
  const [language, setLanguage] = useState<Language>("en");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [inputValue, setInputValue] = useState("");

  // ── Voice State ─────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // ── Order/Modifier State ────────────────────────────────────────────────
  const [pendingOrder, setPendingOrder] = useState<OrderItem[] | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [pendingModifiers, setPendingModifiers] = useState<PendingModifiers | null>(null);

  // ── Token Usage ─────────────────────────────────────────────────────────
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    inputTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0,
  });

  // ── Suggestions ─────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<string[]>(WELCOME_SUGGESTIONS);

  // ── Load preferences from localStorage ──────────────────────────────────
  useEffect(() => {
    const onboarded = localStorage.getItem(STORAGE_KEYS.hasOnboarded) === "true";
    const savedMode = localStorage.getItem(STORAGE_KEYS.preferredMode) as ChatMode | null;
    const savedLang = localStorage.getItem(STORAGE_KEYS.preferredLang) as Language | null;
    setHasOnboarded(onboarded);
    if (savedMode) setMode(savedMode);
    if (savedLang) setLanguage(savedLang);
  }, []);

  // ── Vercel AI SDK v6 useChat ────────────────────────────────────────────
  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { language, weather },
    }),
    onFinish: ({ message }) => {
      const text = getMessageText(message);

      // Check for ITEMS: marker
      const items = extractItemIds(text);
      if (items) {
        setPendingOrder(items);
      }

      // Check for MODIFIERS: marker
      const mods = extractModifiers(text);
      if (mods) {
        setPendingModifiers({
          ...mods,
          currentGroupIndex: 0,
          selections: {},
        });
      }

      // Update last response for voice panel
      if (message.role === "assistant") {
        setLastResponse(cleanMarkers(text));
        setSuggestions([]); // Clear suggestions after AI responds
      }

      // TTS in voice mode
      if (mode === "voice" && message.role === "assistant") {
        speakText(cleanMarkers(text));
      }
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // ── Fetch weather on open ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || weather) return;
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
          if (res.ok) setWeather(await res.json());
        } catch { /* silent */ }
      },
      () => {} // Denied
    );
  }, [isOpen, weather]);

  // ── Welcome message ────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && hasOnboarded && messages.length === 0) {
      const greeting = user
        ? `Hey ${user.username}! 👋 I'm your FlavorJet assistant. I can help you explore our menu, get recommendations, and place orders. What are you in the mood for?`
        : "Hey there! 👋 I'm your FlavorJet assistant. I can help you explore our menu and find the perfect dish. What are you craving?";
      setMessages([makeUIMessage("assistant", greeting, "welcome")]);
      setSuggestions(WELCOME_SUGGESTIONS);
    }
  }, [isOpen, hasOnboarded, messages.length, user, setMessages]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    setPendingOrder(null);
    setPendingModifiers(null);
    setSuggestions([]);
    sendMessage({ text });
    setInputValue("");
  }, [inputValue, sendMessage]);

  const handleSendText = useCallback((text: string) => {
    setPendingOrder(null);
    setPendingModifiers(null);
    setSuggestions([]);
    sendMessage({ text });
  }, [sendMessage]);

  // ── Menu Item Card Actions ──────────────────────────────────────────────
  const handleQuickAdd = useCallback((itemId: number) => {
    setPendingOrder([{ id: String(itemId), quantity: 1 }]);
  }, []);

  const handleViewDetails = useCallback((url: string) => {
    // Open item page in same tab (outside chat)
    window.open(url, "_blank");
  }, []);

  // ── Cart integration ───────────────────────────────────────────────────
  async function handleAddToCart() {
    if (!pendingOrder || pendingOrder.length === 0) return;
    setAddingToCart(true);

    let allSuccess = true;
    for (const item of pendingOrder) {
      const result = await addToCart(Number(item.id), item.quantity);
      if (result?.error) {
        allSuccess = false;
        if (result.error === "not_authenticated") {
          setMessages((prev) => [
            ...prev,
            makeUIMessage("assistant", "You need to log in first to add items to cart. Please log in and try again!"),
          ]);
          break;
        }
      }
    }

    setAddingToCart(false);
    setPendingOrder(null);

    if (allSuccess) {
      setMessages((prev) => [
        ...prev,
        makeUIMessage("assistant", "Items added to your cart! 🎉 Happy ordering!"),
      ]);
      router.refresh();
      if (mode === "voice") {
        speakText("Items added to your cart! Happy ordering!");
      }
    }
  }

  function handleCancelOrder() {
    setPendingOrder(null);
    setMessages((prev) => [
      ...prev,
      makeUIMessage("assistant", "No worries! Order cancelled. How else can I help?"),
    ]);
  }

  // ── Modifier handling ──────────────────────────────────────────────────
  function handleModifierSelect(groupName: string, modifierIds: number[]) {
    if (!pendingModifiers) return;
    setPendingModifiers((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        selections: { ...prev.selections, [groupName]: modifierIds },
      };
    });
  }

  function handleModifierConfirm() {
    if (!pendingModifiers) return;
    const nextIndex = pendingModifiers.currentGroupIndex + 1;
    if (nextIndex < pendingModifiers.groups.length) {
      // Move to next group
      setPendingModifiers((prev) => prev ? { ...prev, currentGroupIndex: nextIndex } : prev);
      // Speak next group options in voice mode
      if (mode === "voice") {
        const nextGroup = pendingModifiers.groups[nextIndex];
        const optionNames = nextGroup.options.map((o) => o.name).join(", ");
        speakText(`Now pick your ${nextGroup.name}. Options are: ${optionNames}`);
      }
    } else {
      // All groups done — build ITEMS: marker and add to cart
      const allModIds = Object.values(pendingModifiers.selections).flat();
      setPendingOrder([{
        id: String(pendingModifiers.itemId),
        quantity: 1,
        modifiers: allModIds,
      }]);
      setPendingModifiers(null);
    }
  }

  function handleModifierCancel() {
    setPendingModifiers(null);
    setMessages((prev) => [
      ...prev,
      makeUIMessage("assistant", "No problem! What else can I help with?"),
    ]);
  }

  // ── Voice: STT via server proxy ────────────────────────────────────────
  async function startListening() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Set up audio context for analyser
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      setAnalyserNode(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setAnalyserNode(null);

        if (audioChunksRef.current.length === 0) {
          setVoiceState("idle");
          return;
        }

        setVoiceState("processing");
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");
        formData.append("language", language.split("-")[0]);

        try {
          const res = await fetch("/api/stt", { method: "POST", body: formData });
          if (!res.ok) throw new Error("STT failed");
          const result = await res.json();
          if (result.text?.trim()) {
            setTranscript(result.text.trim());
            // Send to AI
            handleSendText(result.text.trim());
          } else {
            setVoiceState("idle");
          }
        } catch (err) {
          console.error("[STT]", err);
          setVoiceState("idle");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceState("listening");
      setTranscript("");

      // Auto-stop after 30s
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 30000);
    } catch {
      console.error("[STT] Mic permission denied");
    }
  }

  function stopListening() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function toggleMic() {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      stopSpeaking();
      startListening();
    }
  }

  // Watch AI loading state to update voiceState
  useEffect(() => {
    if (mode !== "voice") return;
    if (isLoading && voiceState !== "processing") {
      setVoiceState("processing");
    } else if (!isLoading && voiceState === "processing") {
      // Will be set to "speaking" by speakText, or "idle" if no TTS
      if (!isSpeaking) setVoiceState("idle");
    }
  }, [isLoading, voiceState, mode, isSpeaking]);

  // ── Voice: TTS via server proxy ────────────────────────────────────────
  async function speakText(text: string) {
    if (!text) return;
    stopSpeaking();
    setIsSpeaking(true);
    setVoiceState("speaking");

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 500), language }),
      });

      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      // Set up analyser for TTS audio visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioContextRef.current = audioCtx;
      setAnalyserNode(analyser);

      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        setVoiceState("idle");
        setAnalyserNode(null);
        currentAudioRef.current = null;
        audioCtx.close();
      };
      audio.play();
    } catch {
      setIsSpeaking(false);
      setVoiceState("idle");
    }
  }

  function stopSpeaking() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    setIsSpeaking(false);
    setAnalyserNode(null);
  }

  // ── Onboarding complete ────────────────────────────────────────────────
  function handleOnboardingComplete(selectedMode: ChatMode) {
    setMode(selectedMode);
    setHasOnboarded(true);
    localStorage.setItem(STORAGE_KEYS.hasOnboarded, "true");
    localStorage.setItem(STORAGE_KEYS.preferredMode, selectedMode);
  }

  // ── Mode switch ────────────────────────────────────────────────────────
  function handleModeSwitch(newMode: ChatMode) {
    stopSpeaking();
    stopListening();
    setVoiceState("idle");
    setMode(newMode);
    localStorage.setItem(STORAGE_KEYS.preferredMode, newMode);
  }

  // ── Language change ────────────────────────────────────────────────────
  function handleLanguageChange(lang: Language) {
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEYS.preferredLang, lang);
    setMessages([]);
    setPendingOrder(null);
    setPendingModifiers(null);
    setSuggestions(WELCOME_SUGGESTIONS);
  }

  // ── Clear chat ─────────────────────────────────────────────────────────
  function handleClear() {
    setMessages([]);
    setPendingOrder(null);
    setPendingModifiers(null);
    setSuggestions(WELCOME_SUGGESTIONS);
    setLastResponse("");
    setTranscript("");
  }

  // ── Open / Close / Minimize ────────────────────────────────────────────
  function openChat() {
    setIsOpen(true);
    setIsMinimized(false);
  }

  function closeChat() {
    stopSpeaking();
    stopListening();
    setIsOpen(false);
    setIsMinimized(false);
    setMessages([]);
    setPendingOrder(null);
    setPendingModifiers(null);
    setWeather(null);
    setVoiceState("idle");
    setSuggestions(WELCOME_SUGGESTIONS);
    setLastResponse("");
    setTranscript("");
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Animated FAB Button ─────────────────────────────────────────── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={openChat}
            className="ai-fab-glow fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-[#fea116] to-[#e89000] text-[#0f172b] shadow-lg flex items-center justify-center hover:scale-110 transition-transform overflow-hidden"
            aria-label="Open AI Assistant"
          >
            <div className="relative">
              <Bot className="w-7 h-7 ai-fab-bot-icon" />
              {/* Sparkle particles */}
              <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-white rounded-full animate-ping opacity-50" />
              <span
                className="absolute -bottom-1 -left-1.5 w-1.5 h-1.5 bg-white/80 rounded-full animate-ping opacity-30"
                style={{ animationDelay: "0.7s" }}
              />
              <span
                className="absolute top-0 -left-2 w-1 h-1 bg-white/60 rounded-full animate-ping opacity-40"
                style={{ animationDelay: "1.4s" }}
              />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Minimized Bar ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && isMinimized && (
          <motion.button
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-full bg-[#0f172b] dark:bg-slate-800 text-white shadow-xl border border-[#fea116]/30 hover:border-[#fea116]/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#fea116] to-[#e89000] flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-[#0f172b]" />
            </div>
            <span className="text-sm font-medium gold-shimmer">FlavorJet AI</span>
            <ChevronDown className="w-4 h-4 text-slate-400 rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="chat-panel-glow fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-80px)] flex flex-col rounded-2xl overflow-hidden border border-[#fea116]/15 dark:border-[#fea116]/10 bg-white dark:bg-[#0f172b]"
          >
            {/* Header (always shown except during onboarding) */}
            {hasOnboarded && (
              <ChatHeader
                mode={mode}
                onModeSwitch={handleModeSwitch}
                language={language}
                onLanguageChange={handleLanguageChange}
                voiceState={voiceState}
                isLoading={isLoading}
                isSpeaking={isSpeaking}
                onClear={handleClear}
                onMinimize={() => setIsMinimized(true)}
                onClose={closeChat}
                tokenUsage={tokenUsage}
                modelName="Gemini 2.5 Flash"
              />
            )}

            {/* ── Body: Onboarding OR Chat/Voice ────────────────────────── */}
            {!hasOnboarded ? (
              <ChatOnboarding
                onSelectMode={handleOnboardingComplete}
                userName={user?.username}
              />
            ) : mode === "chat" ? (
              <>
                <ChatMessages
                  messages={messages}
                  isLoading={isLoading}
                  suggestions={suggestions}
                  onSuggestionSelect={handleSendText}
                  pendingOrder={pendingOrder}
                  onConfirmOrder={handleAddToCart}
                  onCancelOrder={handleCancelOrder}
                  addingToCart={addingToCart}
                  pendingModifiers={pendingModifiers}
                  onModifierSelect={handleModifierSelect}
                  onModifierConfirm={handleModifierConfirm}
                  onModifierCancel={handleModifierCancel}
                  onQuickAdd={handleQuickAdd}
                  onViewDetails={handleViewDetails}
                />
                <ChatInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSend={handleSend}
                  onImageUpload={(b64) => { /* TODO: attach to message */ }}
                  uploadedImage={null}
                  onClearImage={() => {}}
                  isLoading={isLoading}
                  isListening={voiceState === "listening"}
                  onToggleMic={toggleMic}
                />
              </>
            ) : (
              <VoicePanel
                voiceState={voiceState}
                transcript={transcript}
                lastResponse={lastResponse}
                analyserNode={analyserNode}
                onMicToggle={toggleMic}
                audioRef={currentAudioRef}
                pendingOrder={pendingOrder}
                onConfirmOrder={handleAddToCart}
                onCancelOrder={handleCancelOrder}
                addingToCart={addingToCart}
                pendingModifiers={pendingModifiers}
                onModifierSelect={handleModifierSelect}
                onModifierConfirm={handleModifierConfirm}
                onModifierCancel={handleModifierCancel}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
