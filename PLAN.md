# FlavorJet AI Ordering Assistant — Implementation Plan

## Overview
Port the nomnom-demo chatbot concept into FlavorJet v2 using **Vercel AI SDK** for model-agnostic AI, with **ElevenLabs** for voice and **OpenWeatherMap** for weather-based suggestions.

---

## 1. Package Dependencies

```bash
npm install ai @ai-sdk/google @ai-sdk/openai @ai-sdk/anthropic
```

- `ai` — Vercel AI SDK core (streamText, useChat hook)
- `@ai-sdk/google` — Gemini provider (default: gemini-2.5-flash-preview-05-20)
- `@ai-sdk/openai` — OpenAI provider (gpt-4o-mini as default)
- `@ai-sdk/anthropic` — Anthropic provider (claude-sonnet-4-20250514 as default)

---

## 2. Environment Variables

Add to `.env.local`:
```
# AI (default: Google Gemini)
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=<gemini-key>
OPENAI_API_KEY=<openai-key>
ANTHROPIC_API_KEY=<anthropic-key>

# Voice (ElevenLabs)
NEXT_PUBLIC_ELEVENLABS_API_KEY=<elevenlabs-key>
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL

# Weather
OPENWEATHERMAP_API_KEY=<openweathermap-key>
```

Note: `NEXT_PUBLIC_` prefix for ElevenLabs because STT/TTS runs client-side. AI keys stay server-only.

---

## 3. File Structure (New Files)

```
src/
├── app/
│   └── api/
│       ├── chat/
│       │   └── route.ts            ← AI chat streaming endpoint (Vercel AI SDK)
│       └── weather/
│           └── route.ts            ← Weather proxy (hides API key)
├── lib/
│   └── ai/
│       ├── providers.ts            ← Model registry (google/openai/anthropic)
│       ├── system-prompt.ts        ← System prompt builder
│       └── menu-context.ts         ← DB → compact menu text for AI
├── components/
│   └── chat/
│       ├── ChatWidget.tsx          ← Main floating widget (client component)
│       ├── ChatMessages.tsx        ← Message list with auto-scroll
│       ├── ChatInput.tsx           ← Text input + voice + image upload
│       ├── VoiceInput.tsx          ← ElevenLabs STT integration
│       ├── VoiceOutput.tsx         ← ElevenLabs TTS integration
│       └── OrderConfirmCard.tsx    ← "Add to Cart" / "Cancel" buttons
└── app/
    └── layout.tsx                  ← Modified: add <ChatWidget />
```

---

## 4. Architecture: How It All Connects

```
User types/speaks message
        │
        ▼
  ChatWidget.tsx (client)
  ├── useChat() from 'ai/react'  ← handles streaming, message state
  │   └── POST /api/chat  ───────────────────────┐
  │                                                │
  │                                                ▼
  │                                    /api/chat/route.ts (server)
  │                                    ├── Reads menu from DB (menu-context.ts)
  │                                    ├── Builds system prompt (system-prompt.ts)
  │                                    ├── Picks model from providers.ts
  │                                    └── streamText() → streams response back
  │
  ├── On response complete:
  │   └── Check for ITEMS:id:qty marker
  │       ├── If found → show OrderConfirmCard
  │       │   └── "Add to Cart" click → call addToCart() server action
  │       │       └── revalidate layout → cart count updates in Navbar
  │       └── If not found → regular message bubble
  │
  └── Voice flow:
      ├── VoiceInput: mic → MediaRecorder → ElevenLabs STT → transcript
      └── VoiceOutput: AI text → ElevenLabs TTS → audio playback
```

---

## 5. Detailed File Specs

### 5a. `/src/lib/ai/providers.ts` — Model Registry

```typescript
// Configures available AI models with easy switching
// Usage: getModel() returns the active model based on AI_PROVIDER env var
// Exports: getModel(), AVAILABLE_MODELS

// Models configured:
// - google: gemini-2.5-flash-preview-05-20 (default — fast, cheap)
// - openai: gpt-4o-mini (good balance)
// - anthropic: claude-sonnet-4-20250514 (strong reasoning)
```

### 5b. `/src/lib/ai/menu-context.ts` — Menu → AI Text

```typescript
// Queries DB for all available menu items with categories
// Returns compact text like:
//   "Burgers:
//    - Classic Beef Burger (ID:1, $12.99, ★4.8) [Bestseller] — Juicy beef patty...
//    - Spicy Chicken Burger (ID:2, $11.99, ★4.6) [Spicy] — Crispy chicken... [HAS MODIFIERS]"
//
// Key differences from nomnom-demo:
// - Prices in cents → converted to dollars for AI display
// - Items with modifierGroups marked as [HAS MODIFIERS]
// - Badge info (bestseller/spicy/new) included
// - Uses Drizzle ORM queries (not Olo API)
```

### 5c. `/src/lib/ai/system-prompt.ts` — System Prompt Builder

```typescript
// Adapts the nomnom-demo 400-line system prompt for FlavorJet:
// - Same ordering rules: ITEMS:id:quantity marker format
// - Same 2-step confirmation (show summary → wait for "yes" → output ITEMS:)
// - Same weather-based suggestions
// - Same image analysis protocol
// - Same 29 languages support
// - DIFFERENT: Items with [HAS MODIFIERS] → AI says "This item has customization options"
//   and provides link to /menu/categorySlug/itemSlug instead of adding directly
// - DIFFERENT: Uses FlavorJet restaurant branding, not "Munchie"
// - DIFFERENT: Prices shown as $X.XX (converted from cents)
```

### 5d. `/src/app/api/chat/route.ts` — AI Chat Endpoint

```typescript
// POST handler using Vercel AI SDK streamText()
// 1. Receives: messages[], language, weatherData? from client
// 2. Builds menu context from DB (cached for 5 minutes)
// 3. Builds system prompt with menu + weather + language
// 4. Calls streamText() with selected model
// 5. Returns streaming response
//
// Uses: convertToCoreMessages() from 'ai' to convert useChat messages
// Auth: Not required (menu browsing is public), but will pass user context if available
```

### 5e. `/src/app/api/weather/route.ts` — Weather Proxy

```typescript
// GET /api/weather?lat=xx&lon=xx
// Calls OpenWeatherMap API server-side (hides API key)
// Returns: { temp, feels_like, description, humidity, icon }
// Caches response for 30 minutes per location
```

### 5f. `/src/components/chat/ChatWidget.tsx` — Main Widget

```typescript
// Client component — the floating chat widget
// States: closed (FAB only) → open (full panel) → minimized (small bar)
//
// Uses useChat() from 'ai/react' which manages:
//   - messages[] state
//   - input state
//   - handleSubmit / handleInputChange
//   - isLoading state
//   - streaming response display
//
// Additional local state:
//   - isOpen, isMinimized
//   - mode: 'text' | 'voice'
//   - language: Language
//   - pendingOrderItems (extracted from ITEMS: marker)
//   - weather data
//   - image upload state
//
// Key behaviors:
// - On mount: fetch weather based on geolocation
// - On AI response complete: check for ITEMS: marker
//   - If found: show OrderConfirmCard with "Add to Cart" button
//   - If voice mode: auto-add after TTS finishes
// - Send language + weather as request body metadata to /api/chat
// - Dark mode support via Tailwind dark: classes
// - Framer Motion for open/close/minimize animations
```

### 5g. `/src/components/chat/ChatMessages.tsx` — Message List

```typescript
// Renders message bubbles with auto-scroll
// User messages: right-aligned, primary color bg
// AI messages: left-aligned, gray/slate bg
// System messages: centered, smaller text
// Supports: text, images, loading dots animation
// Markdown-lite: converts emojis, bullet points (no heavy markdown)
```

### 5h. `/src/components/chat/ChatInput.tsx` — Input Area

```typescript
// Text input with:
// - Send button (Enter to send)
// - Voice toggle button (switches to VoiceInput mode)
// - Image upload button (camera icon → file input)
// - Image preview with remove button
// - Language selector dropdown
```

### 5i. `/src/components/chat/VoiceInput.tsx` — ElevenLabs STT

```typescript
// Port of nomnom-demo SpeechToTextService:
// - MediaRecorder → captures audio
// - Sends to ElevenLabs /v1/speech-to-text with scribe_v1 model
// - Returns transcript
// - Visual: pulsing mic icon during recording
// - Uses NEXT_PUBLIC_ELEVENLABS_API_KEY
```

### 5j. `/src/components/chat/VoiceOutput.tsx` — ElevenLabs TTS

```typescript
// Port of nomnom-demo TextToSpeechService:
// - Sends text to ElevenLabs /v1/text-to-speech/{voiceId}
// - Model: eleven_turbo_v2_5
// - Plays audio via HTMLAudioElement
// - Exposes isSpeaking state
// - Uses NEXT_PUBLIC_ELEVENLABS_API_KEY
```

### 5k. `/src/components/chat/OrderConfirmCard.tsx` — Cart Integration

```typescript
// Shown when AI response contains ITEMS: marker
// Displays: "Add to Cart" and "Cancel" buttons
// On "Add to Cart":
//   1. Parse ITEMS:id1:qty1;id2:qty2
//   2. For each item:
//      - Check if hasModifiers → if yes, show "Customize first" link
//      - If no modifiers → call addToCart(id, qty) server action
//   3. Show success message
//   4. Minimize chat widget
//   5. Router refresh to update cart count in Navbar
```

---

## 6. Layout Integration

Modify `/src/app/layout.tsx`:
```diff
+ import ChatWidget from "@/components/chat/ChatWidget";

  <Footer />
+ <ChatWidget user={userData} />
```

The widget renders a fixed-position FAB button (bottom-right). When clicked, expands into the chat panel. Works on all pages.

---

## 7. Order of Implementation

1. **Install packages** + set up env vars
2. **`/src/lib/ai/`** — providers, menu-context, system-prompt (server-side foundation)
3. **`/src/app/api/chat/route.ts`** — streaming chat endpoint
4. **`/src/app/api/weather/route.ts`** — weather proxy
5. **`/src/components/chat/ChatWidget.tsx`** — main widget with useChat()
6. **`/src/components/chat/ChatMessages.tsx`** — message rendering
7. **`/src/components/chat/ChatInput.tsx`** — text input
8. **`/src/components/chat/OrderConfirmCard.tsx`** — cart integration
9. **`/src/components/chat/VoiceInput.tsx`** — STT
10. **`/src/components/chat/VoiceOutput.tsx`** — TTS
11. **Layout integration** — add widget to layout.tsx
12. **Build & test** — verify everything compiles and works

---

## 8. Key Differences from nomnom-demo

| Aspect | nomnom-demo | FlavorJet v2 |
|--------|-------------|--------------|
| AI SDK | Direct `@google/genai` | Vercel AI SDK (model-agnostic) |
| Models | Gemini only | Gemini + OpenAI + Anthropic (swappable) |
| Streaming | No streaming | Yes (streamText + useChat) |
| State mgmt | NgRx store | React useState + useChat hook |
| API keys | Client-side env | Server-side (except ElevenLabs) |
| Menu data | Olo API response | Drizzle ORM SQLite queries |
| Prices | Dollars (floats) | Cents (integers) → converted |
| Cart action | Custom Olo API | Server action addToCart() |
| Modifiers | Not handled | Items with modifiers → link to detail page |
| Framework | Angular/Ionic | Next.js 16 React |
