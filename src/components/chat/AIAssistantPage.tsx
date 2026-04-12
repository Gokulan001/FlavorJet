"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Globe, Trash2 } from "lucide-react";
import { addToCartBySlug, getCart, placeOrderFromAI } from "@/actions/cart-actions";
import { formatPrice } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { t } from "@/lib/i18n/voiceStrings";

import AIBackground from "./AIBackground";
import ChatMessages from "./ChatMessages";
import TokenBadge from "./TokenBadge";
import ChatInput from "./ChatInput";
import VoicePanel from "./VoicePanel";
import CartSidebar from "./CartSidebar";
import CartItemEditModal from "./CartItemEditModal";
import CheckoutModal from "./CheckoutModal";
import ModifierTray from "./ModifierTray";
import { MenuImagesProvider } from "./MenuImagesContext";
import {
  type ChatMode,
  type Language,
  type VoiceState,
  type WeatherData,
  type TokenUsage,
  type CartContext,
  type FullCartItem,
  getMessageText,
  makeUIMessage,
  STORAGE_KEYS,
  LANGUAGES,
} from "./types";

type VoiceCheckoutStep = "confirm_order" | "tip_ask" | "confirming" | null;

// ── Default suggestions ─────────────────────────────────────────────────────

const WELCOME_SUGGESTIONS = [
  "What's popular?",
  "Show me burgers",
  "Something under $12",
  "Recommend for me",
];

// ── Language-aware welcome messages ─────────────────────────────────────────

const WELCOME_GREETINGS: Partial<Record<Language, { withName: string; withoutName: string }>> = {
  en: {
    withName: "Hey {name}! I'm your FlavorJet assistant. What are you craving today? 🍽️",
    withoutName: "Hey there! I'm your FlavorJet assistant. What are you craving today? 🍽️",
  },
  ta: {
    withName: "வணக்கம் {name}! நான் உங்கள் FlavorJet AI. இன்று என்ன சாப்பிட விரும்புகிறீர்கள்? 🍽️",
    withoutName: "வணக்கம்! நான் உங்கள் FlavorJet AI. இன்று என்ன சாப்பிட விரும்புகிறீர்கள்? 🍽️",
  },
  es: {
    withName: "¡Hola {name}! Soy tu asistente FlavorJet. ¿Qué te apetece hoy? 🍽️",
    withoutName: "¡Hola! Soy tu asistente FlavorJet. ¿Qué te apetece hoy? 🍽️",
  },
  ar: {
    withName: "مرحباً {name}! أنا مساعد FlavorJet. ماذا تريد أن تأكل اليوم؟ 🍽️",
    withoutName: "مرحباً! أنا مساعد FlavorJet. ماذا تريد أن تأكل اليوم؟ 🍽️",
  },
  hi: {
    withName: "नमस्ते {name}! मैं आपका FlavorJet सहायक हूं। आज क्या खाना चाहेंगे? 🍽️",
    withoutName: "नमस्ते! मैं आपका FlavorJet सहायक हूं। आज क्या खाना चाहेंगे? 🍽️",
  },
  fr: {
    withName: "Bonjour {name}! Je suis votre assistant FlavorJet. Qu'est-ce qui vous fait envie? 🍽️",
    withoutName: "Bonjour! Je suis votre assistant FlavorJet. Qu'est-ce qui vous fait envie? 🍽️",
  },
  zh: {
    withName: "你好 {name}！我是您的FlavorJet助手。今天想吃什么？🍽️",
    withoutName: "你好！我是您的FlavorJet助手。今天想吃什么？🍽️",
  },
  de: {
    withName: "Hallo {name}! Ich bin Ihr FlavorJet-Assistent. Was möchten Sie heute essen? 🍽️",
    withoutName: "Hallo! Ich bin Ihr FlavorJet-Assistent. Was möchten Sie heute essen? 🍽️",
  },
  ja: {
    withName: "こんにちは {name}！FlavorJet AIです。今日は何を食べたいですか？🍽️",
    withoutName: "こんにちは！FlavorJet AIです。今日は何を食べたいですか？🍽️",
  },
  ko: {
    withName: "안녕하세요 {name}! FlavorJet AI입니다. 오늘 뭘 드시겠어요? 🍽️",
    withoutName: "안녕하세요! FlavorJet AI입니다. 오늘 뭘 드시겠어요? 🍽️",
  },
  pt: {
    withName: "Olá {name}! Sou seu assistente FlavorJet. O que você quer comer hoje? 🍽️",
    withoutName: "Olá! Sou seu assistente FlavorJet. O que você quer comer hoje? 🍽️",
  },
  ru: {
    withName: "Привет {name}! Я ваш помощник FlavorJet. Что хотите сегодня? 🍽️",
    withoutName: "Привет! Я ваш помощник FlavorJet. Что хотите сегодня? 🍽️",
  },
  it: {
    withName: "Ciao {name}! Sono il tuo assistente FlavorJet. Cosa hai voglia di mangiare? 🍽️",
    withoutName: "Ciao! Sono il tuo assistente FlavorJet. Cosa hai voglia di mangiare? 🍽️",
  },
};

function getWelcomeGreeting(language: Language, username?: string | null): string {
  const entry = WELCOME_GREETINGS[language] ?? WELCOME_GREETINGS["en"]!;
  if (username) {
    return entry.withName.replace("{name}", username);
  }
  return entry.withoutName;
}

// ── Local greeting interception (no API call needed) ────────────────────────

const GREETING_RE =
  /^(hi+|hey+|hello+|yo|sup|howdy|hiya|what'?s up|how are (you|u)|good (morning|evening|afternoon|day))[\s!?.]*$/i;
const THANKS_RE =
  /^(thanks?|thank you|thx|ty|appreciate it|great|awesome|perfect|wonderful|nice|cool|ok|okay|sure)[\s!.]*$/i;

const GREETING_POOL = [
  "Hey! Ready to find you something delicious. What are you craving?",
  "Hi there! What can I get for you today?",
  "Hello! What sounds good to you right now?",
  "Hey! Tell me what you're in the mood for and I'll find it.",
];
const THANKS_POOL = [
  "Of course! Let me know if you need anything else.",
  "Happy to help! Anything else I can get for you?",
  "Anytime! What else are you looking for?",
];

function tryLocalResponse(text: string): string | null {
  const t = text.trim();
  if (THANKS_RE.test(t))
    return THANKS_POOL[Math.floor(Math.random() * THANKS_POOL.length)];
  if (GREETING_RE.test(t))
    return GREETING_POOL[Math.floor(Math.random() * GREETING_POOL.length)];
  return null;
}

// ── Voice checkout helpers ───────────────────────────────────────────────────

const CHECKOUT_INTENT_RE =
  /\b(place (my |the )?order|checkout|check ?out|submit (my |the )?order|finalize (my |the )?order|confirm (my |the )?order)\b/i;

// ── Types ───────────────────────────────────────────────────────────────────

interface AIAssistantPageProps {
  user: {
    username: string;
    profilePicture: string | null;
    hasAddress: boolean;
    addressString: string | null;
  } | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function AIAssistantPage({ user }: AIAssistantPageProps) {
  const router = useRouter();
  const { toast } = useToast();

  // ── Core State ──────────────────────────────────────────────────────────
  const [mode, setMode] = useState<ChatMode>("chat");
  const [language, setLanguage] = useState<Language>("en");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

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
  const micBusyRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Voice checkout state ──────────────────────────────────────────────────
  const [voiceCheckoutStep, setVoiceCheckoutStep] = useState<VoiceCheckoutStep>(null);
  const [voiceCheckoutRetry, setVoiceCheckoutRetry] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const [voiceOrderSuccess, setVoiceOrderSuccess] = useState<{ orderId: number; eta: number } | null>(null);
  const voiceCheckoutStepRef = useRef<VoiceCheckoutStep>(null);
  const pendingRedirectRef = useRef<string | null>(null);
  const autoListenRef = useRef(false);
  const modeRef = useRef(mode);

  // ── Cart State ──────────────────────────────────────────────────────────
  const [cartContext, setCartContext] = useState<CartContext | null>(null);
  const [fullCartItems, setFullCartItems] = useState<FullCartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [activeModifierSlug, setActiveModifierSlug] = useState<string | null>(null);
  const [pendingModifierQueue, setPendingModifierQueue] = useState<string[]>([]);
  const [editingCartItem, setEditingCartItem] = useState<FullCartItem | null>(null);

  // ── Token Usage ─────────────────────────────────────────────────────────
  const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    toolCalls: 0,
  });

  // ── Suggestions ─────────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<string[]>(WELCOME_SUGGESTIONS);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const langPickerRef = useRef<HTMLDivElement>(null);

  // ── User order state ──────────────────────────────────────────────────
  const userOrderState: "guest" | "no-address" | "ready" = !user
    ? "guest"
    : user.hasAddress
    ? "ready"
    : "no-address";

  // ── Load preferences ──────────────────────────────────────────────────
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEYS.preferredMode) as ChatMode | null;
    const savedLang = localStorage.getItem(STORAGE_KEYS.preferredLang) as Language | null;
    if (savedMode) setMode(savedMode);
    if (savedLang) setLanguage(savedLang);
  }, []);

  // Close language picker on outside click
  useEffect(() => {
    if (!showLangPicker) return;
    function handleClick(e: MouseEvent) {
      if (langPickerRef.current && !langPickerRef.current.contains(e.target as Node)) {
        setShowLangPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showLangPicker]);

  // ── Fetch cart on mount ───────────────────────────────────────────────
  const refreshCart = useCallback(async () => {
    try {
      const cart = await getCart();
      setFullCartItems(cart as FullCartItem[]);
      if (cart.length === 0) {
        setCartContext({ items: [], total: "$0.00" });
        return;
      }
      const total = cart.reduce((sum, item) => sum + item.lineTotal, 0);
      setCartContext({
        items: cart.map((c) => ({
          name: c.itemName,
          qty: c.quantity,
          price: formatPrice(c.unitPrice),
          slug: c.itemSlug,
        })),
        total: formatPrice(total),
      });
    } catch {
      setFullCartItems([]);
      setCartContext({ items: [], total: "$0.00" });
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // ── Sync refs to latest state (avoid stale closures in async handlers) ──
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { voiceCheckoutStepRef.current = voiceCheckoutStep; }, [voiceCheckoutStep]);

  // P3-2: Cleanup on unmount — stop audio, abort fetches, close AudioContext
  useEffect(() => () => {
    if (currentAudioRef.current) {
      const src = currentAudioRef.current.src;
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    abortControllerRef.current?.abort();
    if (audioContextRef.current?.state !== "closed") {
      try { audioContextRef.current?.close(); } catch { /* noop */ }
    }
  }, []);

  // ── Stable transport — body reads latest state via ref (never recreates) ──
  const bodyRef = useRef({ language, weather, cartContext, isVoiceMode: false });
  useEffect(() => {
    bodyRef.current = { language, weather, cartContext, isVoiceMode: mode === "voice" };
  }, [language, weather, cartContext, mode]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => bodyRef.current, // Resolvable<object> — function form
      }),
    [] // stable — never recreates, preserves onFinish callback
  );

  // ── Vercel AI SDK v6 useChat ──────────────────────────────────────────
  const { messages, sendMessage, status, setMessages, stop } = useChat({
    transport,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onData: (dataPart: any) => {
      if (dataPart?.type === "data-token-usage") {
        const u = dataPart.data;
        setTokenUsage((prev) => ({
          inputTokens: prev.inputTokens + (u.inputTokens ?? 0),
          outputTokens: prev.outputTokens + (u.outputTokens ?? 0),
          totalTokens: prev.totalTokens + (u.totalTokens ?? 0),
          toolCalls: prev.toolCalls + (u.toolCalls ?? 0),
        }));
      }
    },
    onFinish: ({ message }) => {
      const text = getMessageText(message);

      // Track tool results for voice fallback when Gemini returns no text
      const addedNames: string[] = [];
      let removedItem = false;
      let hasModifiers = false;

      // Check if add_to_cart or remove_from_cart was called — refresh cart + handle modifier queue
      for (const part of message.parts) {
        if (!part.type.startsWith("tool-")) continue;
        const toolPart = part as unknown as {
          type: string;
          state: string;
          output?: unknown;
        };

        if (toolPart.state !== "output-available" || !toolPart.output) continue;
        const output = toolPart.output as Record<string, unknown>;

        if (toolPart.type === "tool-remove_from_cart" && output.success) {
          removedItem = true;
          refreshCart();
          router.refresh();
        }

        if (toolPart.type === "tool-add_to_cart") {
          const added = output.added as string[] | undefined;
          if (added) addedNames.push(...added);
          // Refresh cart if any items were added
          const addedSlugs = output.addedSlugs as string[] | undefined;
          if (addedSlugs && addedSlugs.length > 0) {
            refreshCart();
            router.refresh();
          }
          // Open modifier tray
          const needsMods = output.needsModifiers as { slug: string; name: string }[] | undefined;
          if (needsMods && needsMods.length > 0) {
            hasModifiers = true;
            setActiveModifierSlug(needsMods[0].slug);
            setPendingModifierQueue(needsMods.slice(1).map((i) => i.slug));
            if (modeRef.current === "voice") {
              autoListenRef.current = false;
            }
          }
        }
      }

      // Build voice fallback when Gemini produced no text but tools ran
      let voiceText = text;
      if (!voiceText && modeRef.current === "voice" && message.role === "assistant") {
        if (addedNames.length > 0 && !hasModifiers) {
          voiceText = `Added ${addedNames.join(" and ")}! Anything else?`;
        } else if (addedNames.length > 0 && hasModifiers) {
          voiceText = `Added ${addedNames.join(" and ")}. Some items need customization, check the options.`;
        } else if (removedItem) {
          voiceText = "Removed from your cart. Anything else?";
        }
      }

      // Update voice state
      if (message.role === "assistant") {
        setLastResponse(voiceText || text);
        setSuggestions([]);
      }

      // TTS in voice mode — direct call like original (ref approach caused silent failures)
      if (modeRef.current === "voice" && message.role === "assistant" && voiceText) {
        autoListenRef.current = true;
        speakText(voiceText);
      }
    },
    onError: (err) => {
      console.error("[Chat error]", err);
      toast(t(language, "aiFailed"), "error");
      autoListenRef.current = false;
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // ── Fetch weather on mount ────────────────────────────────────────────
  useEffect(() => {
    if (weather) return;
    navigator.geolocation?.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          if (res.ok) setWeather(await res.json());
        } catch {
          /* silent */
        }
      },
      () => {} // Denied
    );
  }, [weather]);

  // ── Welcome message (language-aware) ─────────────────────────────────
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = getWelcomeGreeting(language, user?.username);
      setMessages([makeUIMessage("assistant", greeting, "welcome")]);
      setSuggestions(WELCOME_SUGGESTIONS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, language, user, setMessages]);

  // ── Send message ──────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text && !uploadedImage) return;
    setSuggestions([]);
    setActiveModifierSlug(null);
    setPendingModifierQueue([]);

    if (uploadedImage) {
      sendMessage({
        text: text || "What is this?",
        files: [{ type: "file", mediaType: "image/png", url: uploadedImage }],
      });
      setUploadedImage(null);
    } else {
      const local = tryLocalResponse(text);
      if (local) {
        setMessages((prev) => [
          ...prev,
          makeUIMessage("user", text),
          makeUIMessage("assistant", local),
        ]);
        setInputValue("");
        return;
      }
      sendMessage({ text });
    }
    setInputValue("");
  }, [inputValue, uploadedImage, sendMessage, setMessages]);

  const handleSendText = useCallback(
    (text: string) => {
      setSuggestions([]);
      setActiveModifierSlug(null);
      const local = tryLocalResponse(text);
      if (local) {
        setMessages((prev) => [
          ...prev,
          makeUIMessage("user", text),
          makeUIMessage("assistant", local),
        ]);
        // In voice mode: speak the local response with audio feedback
        if (modeRef.current === "voice") {
          autoListenRef.current = true;
          speakText(local);
        }
        return;
      }
      sendMessage({ text });
    },
    [sendMessage, setMessages]
  );

  // ── Menu Card Actions ─────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    async (slug: string) => {
      const result = await addToCartBySlug(slug, 1, []);
      if (result?.error) {
        const msg =
          result.error === "not_authenticated"
            ? "You need to log in first to add items to cart."
            : result.error === "item_not_found"
            ? "Item not found. Please try again!"
            : "Couldn't add that item. Please try again!";
        toast(msg, "error");
        setMessages((prev) => [...prev, makeUIMessage("assistant", msg)]);
      } else {
        toast(t(language, "addedToCart"), "success");
        setMessages((prev) => [
          ...prev,
          makeUIMessage("assistant", "Added to your cart! Anything else?"),
        ]);
        refreshCart();
        router.refresh();
      }
    },
    [router, setMessages, refreshCart, toast]
  );

  const handleCustomize = useCallback((slug: string) => {
    setActiveModifierSlug(slug);
  }, []);

  const handleModifierConfirm = useCallback(
    async (slug: string, modifierIds: number[]) => {
      setActiveModifierSlug(null);
      const result = await addToCartBySlug(slug, 1, modifierIds);
      if (result?.error) {
        const msg =
          result.error === "not_authenticated"
            ? "You need to log in first to add items to cart."
            : "Couldn't add that item. Please try again!";
        toast(msg, "error");
        if (modeRef.current === "voice") {
          autoListenRef.current = true;
          speakText(msg);
        } else {
          setMessages((prev) => [...prev, makeUIMessage("assistant", msg)]);
        }
      } else {
        toast(t(language, "customizedAdded"), "success");
        refreshCart();
        router.refresh();
        if (modeRef.current === "voice") {
          autoListenRef.current = true;
          speakText("Added! Anything else?");
        } else {
          setMessages((prev) => [
            ...prev,
            makeUIMessage("assistant", "Customized item added to cart! Anything else?"),
          ]);
        }
      }
      // Pop next pending item
      setPendingModifierQueue((prev) => {
        if (prev.length > 0) {
          setActiveModifierSlug(prev[0]);
          return prev.slice(1);
        }
        return prev;
      });
    },
    [router, setMessages, refreshCart]
  );

  const handleModifierCancel = useCallback(() => {
    setActiveModifierSlug(null);
    setPendingModifierQueue([]);
    if (modeRef.current === "voice") {
      autoListenRef.current = true;
      speakText("No problem, skipped! Anything else?");
    }
  }, []);

  // ── Voice: checkout flow ─────────────────────────────────────────────

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function placeVoiceOrder(tip: number) {
    setVoiceCheckoutStep("confirming");
    try {
      const result = await placeOrderFromAI(tip);
      if (!result || "error" in result) {
        setVoiceCheckoutStep(null);
        setVoiceCheckoutRetry(0);
        autoListenRef.current = true;
        speakText("Sorry, couldn't place your order. Please try again.");
        return;
      }
      const { orderId, estimatedMinutes } = result as { orderId: number; estimatedMinutes: number };
      setVoiceCheckoutStep(null);
      setVoiceCheckoutRetry(0);
      setVoiceOrderSuccess({ orderId, eta: estimatedMinutes });
      pendingRedirectRef.current = `/orders/${orderId}`;
      refreshCart();
      router.refresh();
      const eta = estimatedMinutes ? `Arriving in ${estimatedMinutes} minutes.` : "On its way!";
      speakText(`Order placed! ${eta} Enjoy your meal!`);
    } catch {
      setVoiceCheckoutStep(null);
      autoListenRef.current = true;
      speakText("Something went wrong. Please try again.");
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function handleVoiceCheckout() {
    if (!cartContext || cartContext.items.length === 0) {
      autoListenRef.current = true;
      speakText(t(language, "cartEmpty"));
      return;
    }
    if (userOrderState === "guest") {
      autoListenRef.current = true;
      speakText(t(language, "notLoggedIn"));
      return;
    }
    if (userOrderState === "no-address") {
      autoListenRef.current = true;
      speakText(t(language, "noAddress"));
      return;
    }
    const itemList = cartContext.items.map((i) => `${i.qty} ${i.name}`).join(", ");
    setVoiceCheckoutStep("confirm_order");
    voiceCheckoutStepRef.current = "confirm_order";
    autoListenRef.current = true;
    speakText(
      `You have ${itemList}. Total is ${cartContext.total}. Shall I place this order?`
    );
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  async function handleVoiceCheckoutResponse(text: string) {
    const step = voiceCheckoutStepRef.current;
    const lower = text.toLowerCase().trim();

    // Step 1: Confirm order
    if (step === "confirm_order") {
      const isYes = /\b(yes|yeah|yep|sure|ok|okay|yea|absolutely|definitely|go|do it|place|confirm)\b/i.test(lower);
      const isNo = /\b(no|nope|nah|cancel|stop|wait|hold|don't|dont|not yet)\b/i.test(lower);
      if (isYes) {
        setVoiceCheckoutStep("tip_ask");
        voiceCheckoutStepRef.current = "tip_ask";
        setVoiceCheckoutRetry(0);
        autoListenRef.current = true;
        speakText(
          "Would you like to add a tip? Say a number like 5 or 10 dollars, or say no tip."
        );
      } else if (isNo) {
        setVoiceCheckoutStep(null);
        voiceCheckoutStepRef.current = null;
        autoListenRef.current = true;
        speakText("No problem, keep browsing!");
      } else {
        autoListenRef.current = true;
        speakText("Just say yes to place the order, or no to cancel.");
      }
      return;
    }

    // Step 2: Combined tip (number OR "no")
    if (step === "tip_ask") {
      const match = text.match(/(\d+(?:\.\d+)?)/);
      const isNo = /\b(no|nope|none|skip|zero|nothing|don't|dont|nah|pass)\b/i.test(lower);
      const isYesOnly = /\b(yes|yeah|yep|sure|ok|okay)\b/i.test(lower) && !match;

      if (match) {
        const amount = parseFloat(match[1]);
        setVoiceCheckoutStep(null);
        voiceCheckoutStepRef.current = null;
        setVoiceCheckoutRetry(0);
        await placeVoiceOrder(amount);
      } else if (isNo) {
        setVoiceCheckoutStep(null);
        voiceCheckoutStepRef.current = null;
        setVoiceCheckoutRetry(0);
        await placeVoiceOrder(0);
      } else if (isYesOnly && voiceCheckoutRetry < 1) {
        setVoiceCheckoutRetry((r) => r + 1);
        autoListenRef.current = true;
        speakText("How much? Just say the number, like 5 or 10.");
      } else if (voiceCheckoutRetry < 2) {
        setVoiceCheckoutRetry((r) => r + 1);
        autoListenRef.current = true;
        speakText("Say a number for the tip, or say no tip.");
      } else {
        // Fallback: show visual tip picker
        setVoiceCheckoutStep(null);
        voiceCheckoutStepRef.current = null;
        setVoiceCheckoutRetry(0);
        setShowTipModal(true);
      }
      return;
    }
  }

  // ── Voice: STT via server proxy ───────────────────────────────────────

  async function startListening() {
    if (micBusyRef.current) return;
    micBusyRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      setAnalyserNode(analyser);

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          try {
            audioCtx.close();
          } catch {
            // AudioContext already closed, ignore
          }
          if (audioContextRef.current === audioCtx) {
            audioContextRef.current = null;
          }
          setAnalyserNode(null);

          if (audioChunksRef.current.length === 0) {
            setVoiceState("idle");
            mediaRecorderRef.current = null;
            micBusyRef.current = false;
            return;
          }

          setVoiceState("processing");
          const blob = new Blob(audioChunksRef.current, { type: mimeType });

          // P2-1: Skip STT for empty/tiny recordings (fast mic on/off)
          if (blob.size < 1000) {
            toast(t(language, "speakLonger"), "info");
            setVoiceState("idle");
            mediaRecorderRef.current = null;
            micBusyRef.current = false;
            return;
          }

          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          formData.append("language", language.split("-")[0]);

          // P3-1: AbortController for STT fetch
          abortControllerRef.current?.abort();
          const ac = new AbortController();
          abortControllerRef.current = ac;

          try {
            const res = await fetch("/api/stt", { method: "POST", body: formData, signal: ac.signal });
            if (!res.ok) throw new Error("STT failed");
            const result = await res.json();
            const minLen = voiceCheckoutStepRef.current ? 1 : 2;
            if (result.text?.trim() && result.text.trim().length >= minLen) {
              const transcribedText = result.text.trim();
              setTranscript(transcribedText);
              if (voiceCheckoutStepRef.current) {
                handleVoiceCheckoutResponse(transcribedText);
              } else if (
                modeRef.current === "voice" &&
                CHECKOUT_INTENT_RE.test(transcribedText) &&
                (cartContext?.items.length ?? 0) > 0
              ) {
                handleVoiceCheckout();
              } else {
                handleSendText(transcribedText);
              }
            } else {
              setVoiceState("idle");
              mediaRecorderRef.current = null;
            }
          } catch (err) {
            if ((err as Error).name === "AbortError") {
              // Cancelled by user — silent
              setVoiceState("idle");
            } else {
              console.error("[STT]", err);
              toast(t(language, "voiceFailed"), "error");
              setVoiceState("idle");
            }
            mediaRecorderRef.current = null;
          }
        } catch (err) {
          console.error("[Recorder cleanup error]", err);
          setVoiceState("idle");
          mediaRecorderRef.current = null;
        } finally {
          micBusyRef.current = false;
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setVoiceState("listening");
      setTranscript("");
      setLastResponse("");

      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 30000);
    } catch {
      console.error("[STT] Mic permission denied");
      toast(t(language, "micDenied"), "error");
      setVoiceState("idle");
      micBusyRef.current = false;
    }
  }

  function stopListening() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    // Reset auto-listen flag when user manually stops
    autoListenRef.current = false;
  }

  function toggleMic() {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "speaking") {
      // P2-3: Cancel playback, go idle
      stopSpeaking();
      setVoiceState("idle");
    } else if (voiceState === "processing") {
      // Cancel both STT fetch and AI streaming
      abortControllerRef.current?.abort();
      stop();
      autoListenRef.current = false;
      micBusyRef.current = false;
      setVoiceState("idle");
    } else if (voiceState === "idle") {
      stopSpeaking();
      startListening();
    }
  }

  // Watch AI loading state to update voiceState — runs in BOTH chat and voice mode
  // (mic button is available in chat mode too, so voiceState must reset regardless of mode)
  useEffect(() => {
    if (isLoading && voiceState !== "processing") {
      setVoiceState("processing");
    } else if (!isLoading && voiceState === "processing") {
      if (!isSpeaking) setVoiceState("idle");
    }
  }, [isLoading, voiceState, isSpeaking]);

  // ── Voice: TTS via server proxy ───────────────────────────────────────

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
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(audio);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      audioContextRef.current = audioCtx;
      setAnalyserNode(analyser);

      const cleanupAudio = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
        setVoiceState("idle");
        setAnalyserNode(null);
        currentAudioRef.current = null;
        try { audioCtx.close(); } catch { /* already closed */ }
        audioContextRef.current = null;
      };

      audio.onended = () => {
        cleanupAudio();
        if (pendingRedirectRef.current) {
          const path = pendingRedirectRef.current;
          pendingRedirectRef.current = null;
          setTimeout(() => router.push(path), 800);
          return;
        }
        // Auto-listen after AI speaks (original behavior)
        // Guard: only auto-listen if in voice mode, flag is set, and not already busy
        if (modeRef.current === "voice" && autoListenRef.current && !micBusyRef.current) {
          autoListenRef.current = false;
          setTimeout(() => {
            if (!micBusyRef.current) startListening();
          }, 350);
        }
      };
      audio.onerror = () => {
        cleanupAudio();
        toast(t(language, "playbackFailed"), "error");
      };
      audio.play();
    } catch {
      toast(t(language, "playbackFailed"), "error");
      setIsSpeaking(false);
      setVoiceState("idle");
    }
  }

  function stopSpeaking() {
    if (currentAudioRef.current) {
      // P3-2: Revoke blob URL on manual stop
      const src = currentAudioRef.current.src;
      if (src.startsWith("blob:")) URL.revokeObjectURL(src);
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      try { audioContextRef.current.close(); } catch { /* already closed */ }
    }
    audioContextRef.current = null;
    setIsSpeaking(false);
    setAnalyserNode(null);
  }

  // ── Mode switch ───────────────────────────────────────────────────────
  function handleModeSwitch(newMode: ChatMode) {
    stopSpeaking();
    stopListening();
    setVoiceState("idle");
    setVoiceCheckoutStep(null);
    voiceCheckoutStepRef.current = null;
    setVoiceCheckoutRetry(0);
    setShowTipModal(false);
    setVoiceOrderSuccess(null);
    pendingRedirectRef.current = null;
    autoListenRef.current = false;
    setPendingModifierQueue([]);
    setMode(newMode);
    localStorage.setItem(STORAGE_KEYS.preferredMode, newMode);
  }

  // ── Language change ───────────────────────────────────────────────────
  function handleLanguageChange(lang: Language) {
    stopSpeaking();
    stopListening();
    setVoiceState("idle");
    setIsSpeaking(false);
    setTranscript("");
    setLastResponse("");
    setVoiceCheckoutStep(null);
    voiceCheckoutStepRef.current = null;
    setVoiceCheckoutRetry(0);
    setShowTipModal(false);
    setVoiceOrderSuccess(null);
    pendingRedirectRef.current = null;
    autoListenRef.current = false;
    setPendingModifierQueue([]);
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEYS.preferredLang, lang);
    setMessages([]);
    setSuggestions(WELCOME_SUGGESTIONS);
  }

  // ── Clear chat ────────────────────────────────────────────────────────
  function handleClear() {
    setMessages([]);
    setSuggestions(WELCOME_SUGGESTIONS);
    setLastResponse("");
    setTranscript("");
    setActiveModifierSlug(null);
    setVoiceCheckoutStep(null);
    voiceCheckoutStepRef.current = null;
    setVoiceCheckoutRetry(0);
    autoListenRef.current = false;
    setPendingModifierQueue([]);
    setTokenUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0 });
  }

  // ── Bottom warning text ───────────────────────────────────────────────
  function renderBottomWarning() {
    if (userOrderState === "ready") return null;

    if (userOrderState === "guest") {
      return (
        <p className="text-[11px] text-slate-500 text-center px-4 py-1.5">
          <Link href="/login" className="text-[#fea116] hover:underline">
            Log in
          </Link>
          {" and "}
          <Link href="/profile" className="text-[#fea116] hover:underline">
            save an address
          </Link>
          {" for AI ordering"}
        </p>
      );
    }

    return (
      <p className="text-[11px] text-slate-500 text-center px-4 py-1.5">
        <Link href="/profile" className="text-[#fea116] hover:underline">
          Save an address
        </Link>
        {" in your profile for AI ordering"}
      </p>
    );
  }

  // ── Derived status ───────────────────────────────────────────────────
  const isActive = isLoading || voiceState !== "idle" || isSpeaking;
  const statusText = isLoading || voiceState === "processing"
    ? "Thinking..."
    : isSpeaking || voiceState === "speaking"
    ? "Speaking..."
    : voiceState === "listening"
    ? "Listening..."
    : "Online";

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <MenuImagesProvider>
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100dvh - 80px)" }}>
      <AIBackground />

      {/* Cart Item Edit Modal */}
      <CartItemEditModal
        item={editingCartItem}
        onClose={() => setEditingCartItem(null)}
        onRefreshCart={refreshCart}
      />

      {/* Checkout Modal (chat mode) */}
      {showCheckout && (
        <CheckoutModal
          cart={cartContext}
          onClose={() => setShowCheckout(false)}
          onOrderPlaced={() => {
            setShowCheckout(false);
            refreshCart();
            router.refresh();
            setMessages((prev) => [
              ...prev,
              makeUIMessage("assistant", "Order placed! Redirecting to your order..."),
            ]);
          }}
        />
      )}

      {/* Voice: Modifier modal overlay */}
      <AnimatePresence>
        {mode === "voice" && activeModifierSlug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm pb-4 px-3"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-lg"
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-[#fea116]/10 border-x border-t border-[#fea116]/25 rounded-t-2xl">
                <div className="w-2 h-2 rounded-full bg-[#fea116] animate-pulse" />
                <p className="text-[#fea116] text-sm font-medium">
                  Select your options below, then tap &ldquo;Add to Cart&rdquo;
                </p>
              </div>
              <ModifierTray
                slug={activeModifierSlug}
                onConfirm={handleModifierConfirm}
                onCancel={handleModifierCancel}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice: Tip fallback modal */}
      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm pb-6 px-4"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-full max-w-sm bg-slate-900 rounded-3xl p-6 border border-white/10"
            >
              <h3 className="text-white text-lg font-bold text-center mb-1">Add a tip?</h3>
              <p className="text-white/40 text-xs text-center mb-5">Tap to select an amount</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 15, 20].map((amt) => (
                  <motion.button
                    key={amt}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => { setShowTipModal(false); placeVoiceOrder(amt); }}
                    className="py-3 rounded-xl bg-[#fea116]/10 border border-[#fea116]/30 text-[#fea116] font-bold text-sm"
                  >
                    ${amt}
                  </motion.button>
                ))}
              </div>
              <button
                onClick={() => { setShowTipModal(false); placeVoiceOrder(0); }}
                className="w-full py-2.5 text-white/40 text-sm font-medium hover:text-white/60 transition-colors"
              >
                No tip, just place my order
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice: Order success overlay */}
      <AnimatePresence>
        {voiceOrderSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-emerald-600/95 backdrop-blur-sm"
          >
            <div className="text-center text-white px-6">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="text-7xl mb-5"
              >
                ✓
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-3xl font-bold mb-2"
              >
                Order Placed!
              </motion.h2>
              {voiceOrderSuccess.eta > 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-emerald-100 text-lg"
                >
                  Arriving in ~{voiceOrderSuccess.eta} minutes
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex-1 flex flex-col min-h-0 w-full"
      >
        {/* Body: 60/40 layout with glass panels — fills viewport (navbar is floating) */}
        <div className="flex-1 min-h-0 flex max-w-7xl mx-auto w-full gap-3 px-3 pb-3 overflow-hidden">
          {/* ─── Left panel — Chat / Voice ─── */}
          <div
            className={`flex flex-col rounded-3xl overflow-hidden shadow-xl ${
              mode === "voice"
                ? "flex-1"
                : "flex-1 lg:w-[60%] bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/30"
            }`}
            style={{ minHeight: 0 }}
          >
            {/* Floating controls bar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5">
              {/* Status indicator */}
              <div className="flex items-center gap-2.5">
                <Image
                  src="/ai-avatar.png"
                  alt="AI"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-white/50 dark:ring-slate-700/50 shadow-sm"
                />
                <div className="flex items-center gap-1.5">
                  <div className="relative flex items-center justify-center w-2 h-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? "bg-[#fea116]" : "bg-emerald-400"}`} />
                    {isActive && (
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#fea116] animate-ping opacity-40" />
                    )}
                  </div>
                  <span className={`text-[11px] font-medium ${isActive ? "text-[#fea116]" : "text-emerald-500 dark:text-emerald-400"}`}>
                    {statusText}
                  </span>
                </div>
              </div>

              {/* Right: controls */}
              <div className="flex items-center gap-0.5">
                {/* Debug: token badge */}
                {/* <TokenBadge usage={tokenUsage} model="Gemini 2.5 Flash" /> */}

                {/* Mode switch */}
                <button
                  onClick={() => handleModeSwitch(mode === "chat" ? "voice" : "chat")}
                  className="p-2 rounded-xl text-slate-400 hover:text-[#fea116] hover:bg-[#fea116]/10 transition-all"
                  title={mode === "voice" ? "Switch to Chat" : "Switch to Voice"}
                >
                  {mode === "voice" ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                  )}
                </button>

                {/* Language picker */}
                <div className="relative" ref={langPickerRef}>
                  <button
                    onClick={() => setShowLangPicker(!showLangPicker)}
                    className="p-2 rounded-xl text-slate-400 hover:text-[#fea116] hover:bg-[#fea116]/10 transition-all"
                    title="Language"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showLangPicker && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.95 }}
                        className="absolute right-0 top-10 w-48 max-h-64 overflow-y-auto bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-white/60 dark:border-slate-700 shadow-2xl z-50 scrollbar-hide"
                      >
                        {LANGUAGES.map((lang) => (
                          <button
                            key={lang.code}
                            onClick={() => { handleLanguageChange(lang.code); setShowLangPicker(false); }}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#fea116]/10 transition-colors ${
                              language === lang.code ? "text-[#fea116] font-medium" : "text-slate-700 dark:text-slate-300"
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

                {/* Clear chat */}
                <button
                  onClick={handleClear}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Clear chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Orange separator */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#fea116]/40 to-transparent" />

            {mode === "chat" ? (
              <>
                <ChatMessages
                  messages={messages}
                  isLoading={isLoading}
                  suggestions={suggestions}
                  onSuggestionSelect={handleSendText}
                  onAddToCart={handleAddToCart}
                  onCustomize={handleCustomize}
                  userProfilePicture={user?.profilePicture ?? null}
                />

                {/* Modifier Tray — inline below chat */}
                {activeModifierSlug && (
                  <div className="flex-shrink-0 px-4">
                    <ModifierTray
                      slug={activeModifierSlug}
                      onConfirm={handleModifierConfirm}
                      onCancel={handleModifierCancel}
                    />
                  </div>
                )}

                {/* Input bar */}
                <div className="flex-shrink-0 px-3 pb-3">
                  <ChatInput
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSend}
                    onImageUpload={(b64) => setUploadedImage(b64)}
                    uploadedImage={uploadedImage}
                    onClearImage={() => setUploadedImage(null)}
                    isLoading={isLoading}
                    isListening={voiceState === "listening"}
                    onToggleMic={toggleMic}
                  />
                  {renderBottomWarning()}
                </div>
              </>
            ) : (
              <VoicePanel
                voiceState={voiceState}
                transcript={transcript}
                lastResponse={lastResponse}
                analyserNode={analyserNode}
                onMicToggle={toggleMic}
                audioRef={currentAudioRef}
                cartCount={cartContext?.items.reduce((s, i) => s + i.qty, 0) ?? 0}
                cartTotal={cartContext?.total ?? "$0.00"}
                onCheckout={handleVoiceCheckout}
              />
            )}
          </div>

          {/* ─── Right panel — Cart sidebar (40% desktop, hidden in voice mode + mobile) ─── */}
          <div className={`${mode === "voice" ? "hidden" : "hidden lg:flex"} lg:w-[40%] min-h-0 rounded-3xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl border border-white/60 dark:border-slate-700/30 shadow-xl overflow-hidden`}>
            <CartSidebar
              cart={cartContext}
              fullItems={fullCartItems}
              onCheckout={() => setShowCheckout(true)}
              onEditItem={setEditingCartItem}
            />
          </div>
        </div>
      </motion.div>

      {/* Mobile cart bar — chat mode only */}
      {mode === "chat" && (
        <div className="lg:hidden">
          <CartSidebar
            cart={cartContext}
            fullItems={fullCartItems}
            onCheckout={() => setShowCheckout(true)}
            onEditItem={setEditingCartItem}
          />
        </div>
      )}
    </div>
    </MenuImagesProvider>
  );
}
