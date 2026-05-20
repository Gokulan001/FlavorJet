<div align="center">

# FlavorJet

### AI-Powered Food Ordering — Chat, Voice, or Browse

**Next.js 16 · React 19 · TypeScript · Tailwind v4 · Gemini · Claude · GPT-4o**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Vitest](https://img.shields.io/badge/Vitest-558_tests-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev)
[![Playwright](https://img.shields.io/badge/Playwright-27_E2E-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Gokulan001/flavorjet-v2)

</div>

---

## Live Demo

> **[https://flavorjet.vercel.app](https://flavorjet.vercel.app)** *(replace with your deployment URL)*

| Screen | Path | Auth |
|--------|------|------|
| Homepage — hero, popular menu, testimonials | `/` | Public |
| AI Assistant — chat, voice, image recognition | `/order-ai` | Required |
| Menu — category browse + item detail | `/menu` | Public |
| Cart — live total, modifiers, tip | `/cart` | Public |
| Checkout — address, payment, order placement | `/checkout` | Required |
| Orders — history, timeline, reorder | `/orders` | Required |
| Profile — address management, order stats | `/profile` | Required |

---

## Feature Highlights

### AI Ordering Assistant

| Capability | Detail |
|------------|--------|
| **Multi-Provider LLM** | Switch Claude Sonnet 4, Gemini 2.5 Flash Lite, or GPT-4o Mini via `AI_PROVIDER` env var — no code change required |
| **Intent Router** | 9 intent types (`chitchat`, `food_search`, `category_browse`, `popular_browse`, `dietary_search`, `direct_order`, `reorder`, `cart_action`, `image`) with regex short-circuit gates that skip API calls entirely for pure greetings |
| **RAG Semantic Search** | Pinecone vector DB + embeddings; natural language queries like "something light and spicy under $15" resolve to ranked menu results |
| **Weather Recommendations** | Live weather context (OpenWeatherMap) — >85°F surfaces cold drinks/salads; <40°F recommends soups and comfort food |
| **Image Recognition** | Upload a food photo; Gemini Vision identifies the dish and finds on-menu matches |
| **Voice I/O** | Browser microphone → ElevenLabs STT → LLM → ElevenLabs TTS; voice mode caps responses at 80 words with no markdown |
| **27 Languages** | Arabic, Tamil, Hindi, Chinese (Mandarin), Japanese, Korean, Vietnamese, Thai, Filipino, and more |
| **Dual Semantic Cache** | Response cache (5-min TTL, FIFO-50 for browse intents) + semantic input cache deduplicate identical stateless queries — zero extra Gemini tokens on hits |
| **10 RAG Tools** | `search_menu`, `get_category_items`, `get_popular_items`, `get_items_by_name`, `get_modifiers`, `add_to_cart`, `remove_from_cart`, `get_order_history`, `get_restaurant_info`, `get_dietary_guide` |
| **Security Guards** | Regex jailbreak/injection filter, Gemini safety settings (`BLOCK_LOW_AND_ABOVE` for NSFW/hate/harassment), IP rate limiting (30 text/10 image requests per minute), image MIME-type validation |

### Menu, Cart & Checkout

- **9 categories** — Burgers, Pizza, Pasta & Noodles, Salads, Soups, Appetizers, Desserts, Seafood, Steaks & Grills
- Item detail pages with modifier groups (size, toppings, add-ons), required modifier enforcement
- Semantic + full-text search with dietary filters: vegan, vegetarian, gluten-free
- Cart with quantity editing, special instructions, modifier display, and smart recommendations
- Tip selector (preset or custom), delivery address management, estimated delivery time

### Auth & Security

- Session-based auth via **Lucia v3** with SQLite adapter
- Password hashing (bcrypt)
- Per-IP rate limiting on all API endpoints
- Input sanitization (XSS prevention via `sanitize.ts`)
- Protected routes via Next.js middleware

---

## Tech Stack

### Frontend

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.1.6 | App Router, Server Actions, RSC, ISR |
| `react` / `react-dom` | 19.2.3 | UI rendering |
| `tailwindcss` | v4 | Utility-first CSS |
| `framer-motion` | 12.34.0 | Scroll animations, transitions |
| `lucide-react` | 0.564.0 | Icon library |

### AI / LLM

| Package | Version | Purpose |
|---------|---------|---------|
| `ai` (Vercel AI SDK) | 6.0.97 | Streaming, tool use, message conversion |
| `@ai-sdk/google` | 3.0.30 | Gemini 2.5 Flash Lite provider |
| `@ai-sdk/anthropic` | 3.0.46 | Claude Sonnet 4 provider |
| `@ai-sdk/openai` | 3.0.30 | GPT-4o Mini provider |
| `@google/genai` | 1.44.0 | Gemini Vision (image recognition) |

### Database & Storage

| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | 0.45.1 | Type-safe ORM |
| `better-sqlite3` | 11.10.0 | Local SQLite (users, cart, orders) |
| `@supabase/supabase-js` | 2.98.0 | Cloud DB for menu, restaurant, dietary data |
| `@pinecone-database/pinecone` | 7.1.0 | Vector embeddings for semantic search |
| `cloudinary` | 2.9.0 | Menu image hosting |

### Auth & Infrastructure

| Package | Version | Purpose |
|---------|---------|---------|
| `lucia` | 3.2.2 | Session management |
| `@lucia-auth/adapter-sqlite` | 3.0.2 | Lucia ↔ SQLite adapter |
| `dotenv` | 17.3.1 | Environment variable loading |

### Testing

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | 4.1.6 | Unit + integration test runner |
| `@vitest/coverage-v8` | 4.1.6 | V8-based coverage reports |
| `@playwright/test` | 1.60.0 | End-to-end browser tests |
| `@testing-library/react` | 16.3.2 | Component testing utilities |
| `@testing-library/user-event` | 14.6.1 | DOM interaction simulation |
| `happy-dom` | 20.9.0 | Lightweight DOM environment for Vitest |

---

## Architecture

```
User (browser)
     │
     ├── Text message ──────────────────────────────────────┐
     │                                                       │
     ├── Voice (mic) ──► /api/stt (ElevenLabs proxy) ───────┤
     │                                                       │
     └── Food photo ────────────────────────────────────────┤
                                                            │
                                                     POST /api/chat
                                                            │
                                               ┌────────────▼────────────┐
                                               │       Chat Route        │
                                               │  ┌─ Rate Limit Check    │
                                               │  ├─ XSS / Injection     │
                                               │  │   Guard              │
                                               │  ├─ Image MIME Check    │
                                               │  └─ Schema Validation   │
                                               └────────────┬────────────┘
                                                            │
                                               ┌────────────▼────────────┐
                                               │     Intent Router       │
                                               │  regex short-circuit    │
                                               │  (chitchat → no LLM)   │
                                               │  9 intent types         │
                                               └────────────┬────────────┘
                                                            │
                                    ┌───────────────────────┼─────────────────────┐
                                    │                       │                     │
                             Response Cache          Semantic Cache         LLM Call
                              (5-min TTL)         (dedup stateless)         (skip if hit)
                                    │                       │                     │
                                    └───────────────────────┴──────────────────┐  │
                                                                               │  │
                                                            ┌──────────────────▼──▼──┐
                                                            │  System Prompt Builder  │
                                                            │  ├─ Cart context        │
                                                            │  ├─ Weather block       │
                                                            │  ├─ Language setting    │
                                                            │  └─ Voice mode rules    │
                                                            └──────────────┬──────────┘
                                                                           │
                                                            ┌──────────────▼──────────┐
                                                            │  LLM Provider           │
                                                            │  (Gemini / Claude /     │
                                                            │   GPT-4o Mini)          │
                                                            │  + Intent-scoped tools  │
                                                            └──────────────┬──────────┘
                                                                           │
                                             ┌─────────────────────────────┤
                                             │     RAG Tools (10 total)    │
                                             │  search_menu (Pinecone)     │
                                             │  get_category_items         │
                                             │  get_popular_items          │
                                             │  get_items_by_name          │
                                             │  get_modifiers              │
                                             │  add_to_cart                │
                                             │  remove_from_cart           │
                                             │  get_order_history          │
                                             │  get_restaurant_info        │
                                             │  get_dietary_guide          │
                                             └─────────────────────────────┘
                                                                           │
                                                            Streaming UI Response
                                                            ├─ Text deltas → MessageBubble
                                                            ├─ Tool results → MenuItemCard
                                                            └─ Token usage → TokenBadge

     TTS path: response text ──► /api/tts (ElevenLabs proxy) ──► audio playback
```

---

## Project Structure

```
flavorjet-v2/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (auth)/login/                 # Login / signup page
│   │   ├── api/
│   │   │   ├── chat/route.ts             # Streaming LLM endpoint — intent routing, caching, security
│   │   │   ├── menu/images/route.ts      # Bulk image URL fetcher from Supabase
│   │   │   ├── modifiers/route.ts        # Modifier groups + options for a menu item
│   │   │   ├── stt/route.ts              # Server-side ElevenLabs STT proxy
│   │   │   ├── tts/route.ts              # Server-side ElevenLabs TTS proxy
│   │   │   └── weather/route.ts          # OpenWeatherMap proxy with 30-min cache
│   │   ├── cart/                         # Cart page
│   │   ├── checkout/                     # Checkout page
│   │   ├── menu/                         # Category grid, item list, item detail, search
│   │   ├── order-ai/                     # AI assistant page (auth-protected)
│   │   ├── orders/                       # Order history + per-order detail
│   │   └── profile/                      # User profile + delivery address
│   │
│   ├── components/
│   │   ├── chat/                         # 20+ AI chat components (ChatInput, MessageBubble, etc.)
│   │   ├── home/                         # Homepage sections (Hero, Categories, Popular, CTA, etc.)
│   │   ├── menu/                         # MenuItemCard, QuickAddButton, ModifierSelector
│   │   ├── cart/                         # CartItemCard, CartRecommendations, TipSelector
│   │   ├── checkout/                     # CheckoutForm, AddressForm, PlaceOrderButton
│   │   ├── orders/                       # OrderTimeline, ReorderButton
│   │   ├── profile/                      # ProfileAddressForm
│   │   ├── search/                       # SearchBar, SearchFilters
│   │   ├── layout/                       # Navbar, Footer
│   │   ├── animations/                   # ScrollReveal (Framer Motion wrappers)
│   │   ├── error/                        # ErrorBoundary
│   │   └── ui/                           # Toast, ThemeProvider, shared primitives
│   │
│   ├── actions/
│   │   ├── auth-actions.ts               # Login, signup, logout Server Actions
│   │   └── cart-actions.ts               # Cart CRUD, checkout, order fetching
│   │
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── intent-router.ts          # 9-intent classifier with regex gates
│   │   │   ├── system-prompt.ts          # Context-aware prompt builder (weather, cart, voice, i18n)
│   │   │   └── providers.ts              # LLM registry — Gemini / Claude / GPT-4o Mini
│   │   ├── rag/
│   │   │   ├── tools.ts                  # 10 AI tool definitions (Vercel AI SDK)
│   │   │   ├── search.ts                 # Semantic search with price + dietary filters
│   │   │   ├── embeddings.ts             # Vector embedding generation
│   │   │   ├── pinecone.ts               # Pinecone client initialisation
│   │   │   └── seed-vectors.ts           # One-time index seeding script
│   │   ├── cache/
│   │   │   └── semanticInputCache.ts     # In-memory semantic input dedup cache
│   │   ├── security/
│   │   │   ├── rateLimit.ts              # Sliding-window per-IP rate limiter
│   │   │   └── sanitize.ts               # XSS input sanitisation
│   │   ├── supabase/
│   │   │   ├── server.ts                 # Service-role Supabase client
│   │   │   └── queries/                  # menu, restaurant, dietary guide queries
│   │   ├── i18n/                         # Language detection helpers
│   │   ├── schemas/                      # Zod validation schemas
│   │   ├── auth.ts                       # Lucia session helpers
│   │   ├── cloudinary.ts                 # Upload helper
│   │   ├── cart-utils.ts                 # Cart computation utilities
│   │   ├── recommendations.ts            # Cart-based recommendation engine
│   │   └── utils.ts                      # formatPrice, slugify, cn helpers
│   │
│   ├── db/
│   │   ├── schema.ts                     # Drizzle schema — 11 tables
│   │   ├── index.ts                      # better-sqlite3 DB client
│   │   └── seed.ts                       # Menu seed data
│   │
│   └── test/
│       ├── db.ts                         # In-memory SQLite for tests
│       └── mocks/                        # next/navigation, next/image, lucia stubs
│
├── e2e/                                  # Playwright E2E (9 spec files, 27 tests)
├── vitest.config.ts
├── vitest.setup.ts
└── playwright.config.ts
```

---

## Getting Started

### Prerequisites

- **Node.js 20+** and npm 10+
- At least one LLM API key — Anthropic, Google, or OpenAI (Google Gemini recommended; free tier available)
- **Pinecone** account — free Starter tier is sufficient
- **Supabase** project — free tier works for development
- **ElevenLabs** account — required only if using voice features
- **OpenWeatherMap** API key — free tier; required only for weather recommendations
- **Cloudinary** account — required only for menu image uploads

### Installation

```bash
git clone https://github.com/Gokulan001/flavorjet-v2.git
cd flavorjet-v2
npm install
```

### Environment Variables

Create `.env.local` in the project root:

<details>
<summary>Full <code>.env.local</code> template</summary>

```env
# ── Images (Cloudinary) ────────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── LLM Provider ──────────────────────────────────────────────
# Options: google | openai | anthropic   (default: google)
AI_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=AIza...

# Uncomment the provider(s) you want to enable:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...

# ── Voice I/O (ElevenLabs) ────────────────────────────────────
# Proxied server-side via /api/tts and /api/stt — never exposed to client
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL     # optional; defaults to "Sarah"

# ── Weather ────────────────────────────────────────────────────
OPENWEATHERMAP_API_KEY=your_key

# ── Supabase (menu data, restaurant info, dietary guides) ──────
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ── Pinecone (vector search) ───────────────────────────────────
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=flavorjet-menu
```

</details>

### Database Setup

```bash
# 1. Push Drizzle schema to local SQLite
npx drizzle-kit push

# 2. Seed menu data into SQLite
npx tsx src/db/seed.ts

# 3. Seed menu item embeddings into Pinecone (run once)
npx tsx src/lib/rag/seed-vectors.ts
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Next.js dev server with HMR |
| Production build | `npm run build` | Optimised production build |
| Start production | `npm run start` | Serve the production build |
| Lint | `npm run lint` | ESLint (Next.js config) |
| Unit tests | `npm run test` | Vitest — run all 558 tests once |
| Unit tests (watch) | `npm run test:watch` | Vitest in interactive watch mode |
| Coverage report | `npm run test:coverage` | V8 coverage → `coverage/index.html` |
| E2E tests | `npm run test:e2e` | Playwright headless (Chromium) |
| E2E tests (UI) | `npm run test:e2e:ui` | Playwright with interactive UI |
| Seed DB | `npx tsx src/db/seed.ts` | Populate local SQLite with menu data |
| Seed vectors | `npx tsx src/lib/rag/seed-vectors.ts` | Upload embeddings to Pinecone |
| Push schema | `npx drizzle-kit push` | Apply schema changes to SQLite |

---

## Testing

### Unit / Integration Tests (Vitest)

**558 tests across 60 files.** Covers every business-critical path with an in-memory SQLite database (`src/test/db.ts`) and mocked Next.js / Lucia dependencies.

| Area | Test files | Key coverage |
|------|-----------|--------------|
| **Auth** | `auth-actions.test.ts`, `auth.test.ts`, `hash.test.ts`, `cloudinary.test.ts` | Login, signup, session lifecycle, bcrypt, image upload |
| **Homepage** | `HeroBanner.test.tsx`, `CategoriesSection.test.tsx`, `PopularMenuSection.test.tsx`, `PopularMenuTabs.test.tsx`, `AnimatedCounter.test.tsx` | Rendering, data loading, tab switching |
| **Menu** | `MenuItemCard.test.tsx`, `QuickAddButton.test.tsx`, `ModifierSelector.test.tsx`, `AddToCartButton.test.tsx`, 5× `page.test.tsx` | Item display, modifier flows, category/item pages |
| **Cart** | `cart-actions.test.ts`, `CartItemCard.test.tsx`, `CartItemEditModal.test.tsx`, `CartRecommendations.test.tsx`, `TipSelector.test.tsx`, `cart-utils.test.ts` | CRUD, tip calc, recommendations |
| **Checkout** | `CheckoutForm.test.tsx`, `AddressForm.test.tsx`, `PlaceOrderButton.test.tsx` | Address validation, order placement |
| **Orders** | `OrderTimeline.test.tsx`, `ReorderButton.test.tsx`, 2× `page.test.tsx` | Status timeline, reorder flow |
| **Profile** | `ProfileAddressForm.test.tsx`, `page.test.tsx` | Address update, stats display |
| **AI Chat** | `ChatInput.test.tsx`, `MessageBubble.test.tsx`, `CartSidebar.test.tsx`, `CheckoutModal.test.tsx`, `ChatHeader.test.tsx`, `SearchFilters.test.tsx`, `SuggestionChips.test.tsx`, `ModifierPicker.test.tsx`, `TokenBadge.test.tsx`, `AIPageHeader.test.tsx`, `AIFloatingButton.test.tsx`, `ChatMessages.test.tsx` | Full chat UI surface |
| **Utilities** | `utils.test.ts`, `sanitize.test.ts`, `rateLimit.test.ts`, `recommendations.test.ts`, `search.test.ts`, `types.test.ts`, `withRetry.test.ts` | XSS vectors, rate limit windows, backoff logic |
| **Layout** | `Navbar.test.tsx`, `ThemeProvider.test.tsx`, `ToastProvider.test.tsx` | Navigation, dark mode, notifications |

```bash
npm run test:coverage
# Open coverage/index.html
```

### E2E Tests (Playwright)

**27 tests across 9 spec files** — headless Chromium against a live dev server.

| Spec file | Tests | Scenarios |
|-----------|-------|-----------|
| `login-signup.spec.ts` | 3 | Register, login, logout |
| `homepage.spec.ts` | 3 | Hero render, sections visible, navigation |
| `menu.spec.ts` | 3 | Category grid, item page, search |
| `cart.spec.ts` | 3 | Add item, update quantity, remove |
| `checkout.spec.ts` | 3 | Address entry, tip selection, place order |
| `orders.spec.ts` | 3 | History list, order detail, reorder |
| `order-ai.spec.ts` | 3 | Auth redirect, page load, chat input |
| `profile.spec.ts` | 3 | Address update, stats render |
| `layout.spec.ts` | 3 | Navbar links, theme toggle, footer |

```bash
npm run test:e2e

# View the interactive HTML report after a run:
npx playwright show-report
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chat` | Streaming AI chat — intent routing, RAG tools, caching, rate limiting |
| `GET` | `/api/weather` | OpenWeatherMap proxy with 30-minute server-side cache |
| `POST` | `/api/stt` | ElevenLabs Speech-to-Text proxy (keeps API key server-side) |
| `POST` | `/api/tts` | ElevenLabs Text-to-Speech proxy (keeps API key server-side) |
| `GET` | `/api/modifiers?slug=<slug>` | Modifier groups and options for a menu item |
| `GET` | `/api/menu/images` | Bulk fetch of `slug → imageUrl` mappings from Supabase |

---

## Database Schema

11 tables managed by Drizzle ORM on SQLite (local) and mirrored menu/restaurant data in Supabase.

```
users ─────────────────── sessions
  │                         (Lucia session store)
  │
  ├─── cart_items ──────── cart_item_modifiers
  │       │                        │
  │       │                        └── modifiers
  │       │                                │
  │       └── menu_items ─── modifier_groups ── modifiers
  │                 │
  │                 └── categories
  │
  └─── orders ──────────── order_items ──── order_item_modifiers
                                │                    │
                           menu_items           modifiers (snapshot)
```

| Table | Purpose |
|-------|---------|
| `users` | Account credentials, profile, delivery address |
| `sessions` | Lucia session tokens with expiry |
| `categories` | 9 menu categories with slug, image, display order |
| `menu_items` | Items with price (cents), slug, rating, availability |
| `modifier_groups` | Customisation groups (e.g. "Choose Size") per item |
| `modifiers` | Individual options with price adjustment in cents |
| `cart_items` | Per-user cart with quantity, special instructions |
| `cart_item_modifiers` | Modifier selections on a cart item |
| `orders` | Placed orders with status, total, tip, delivery address |
| `order_items` | Line items — name + price snapshotted at order time |
| `order_item_modifiers` | Modifier selections snapshotted at order time |

---

## Pages / Routes

| Route | Auth Required | Description |
|-------|:---:|-------------|
| `/` | No | Homepage — sticky hero, categories, popular menu, chefs, testimonials, CTA |
| `/login` | No | Login / sign-up form |
| `/menu` | No | Category grid with image cards |
| `/menu/[categorySlug]` | No | All items in a category (ISR, 10-min revalidation) |
| `/menu/[categorySlug]/[itemSlug]` | No | Item detail — description, price, modifier groups |
| `/menu/search` | No | Semantic + keyword search with vegan/vegetarian/gluten-free filters |
| `/cart` | No | Shopping cart with quantity controls, tip selector, recommendations |
| `/order-ai` | Yes | AI ordering assistant — chat, voice mode, image upload |
| `/checkout` | Yes | Delivery address, order review, place order |
| `/orders` | Yes | Full order history with status badges |
| `/orders/[orderId]` | Yes | Single order — timeline, items, total breakdown |
| `/profile` | Yes | Profile picture, delivery address, order count + stats |

---

## Environment Variables Reference

<details>
<summary>Full reference table</summary>

| Variable | Required | Description |
|----------|:--------:|-------------|
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name for image uploads |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `AI_PROVIDER` | No | LLM backend: `google` (default) \| `openai` \| `anthropic` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | If `AI_PROVIDER=google` | Google Gemini API key |
| `OPENAI_API_KEY` | If `AI_PROVIDER=openai` | OpenAI API key |
| `ANTHROPIC_API_KEY` | If `AI_PROVIDER=anthropic` | Anthropic API key |
| `ELEVENLABS_API_KEY` | For voice features | ElevenLabs API key (server-side only) |
| `ELEVENLABS_VOICE_ID` | No | ElevenLabs voice ID (defaults to "Sarah") |
| `OPENWEATHERMAP_API_KEY` | For weather features | OpenWeatherMap API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (client-visible) |
| `SUPABASE_URL` | Yes | Supabase project URL (server-side) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (client-visible) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-only) |
| `PINECONE_API_KEY` | Yes | Pinecone API key for vector search |
| `PINECONE_INDEX_NAME` | Yes | Name of the Pinecone index (e.g. `flavorjet-menu`) |

</details>

---

## Deployment

### Vercel (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Gokulan001/flavorjet-v2)

1. Click the button above and import the repository.
2. Add all environment variables from the reference table above in the Vercel dashboard.
3. Deploy. Vercel auto-detects Next.js and sets the build command to `next build`.

> **Note on SQLite in production:** `better-sqlite3` writes to the local filesystem, which is ephemeral on Vercel's serverless functions. For a persistent production deployment, migrate user/cart/order data to a cloud database (Supabase, Turso, or PlanetScale) and update the Drizzle adapter. Menu data already lives in Supabase.

### Self-hosted

```bash
npm run build
npm run start
```

Set all environment variables via your host's secret manager or a `.env.production` file.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes and add tests — every new module should have a corresponding `.test.ts(x)` file
4. Ensure all tests pass: `npm run test && npm run test:e2e`
5. Ensure lint passes: `npm run lint`
6. Open a pull request against `main` with a clear description of what changed and why

---

## License

MIT License — see [LICENSE](LICENSE) for details.
