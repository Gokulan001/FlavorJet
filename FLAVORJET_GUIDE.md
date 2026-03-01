# FlavorJet v2 — The Complete Guide

> Everything you need to understand the entire codebase, from the first pixel to the last database query.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Project Setup & Config Files](#2-project-setup--config-files)
3. [Folder Structure — Why Things Are Where They Are](#3-folder-structure--why-things-are-where-they-are)
4. [The Root Layout — Where Everything Starts](#4-the-root-layout--where-everything-starts)
5. [Database Layer — Drizzle ORM + SQLite](#5-database-layer--drizzle-orm--sqlite)
6. [Authentication — Lucia v3](#6-authentication--lucia-v3)
7. [The Homepage](#7-the-homepage)
8. [Menu System — Categories, Items, Modifiers](#8-menu-system--categories-items-modifiers)
9. [Cart & Checkout](#9-cart--checkout)
10. [Order System](#10-order-system)
11. [The AI Assistant — The Star of the Show](#11-the-ai-assistant--the-star-of-the-show)
12. [Styling & Tailwind v4](#12-styling--tailwind-v4)
13. [Dark Mode System](#13-dark-mode-system)
14. [Architecture Patterns & Why We Made These Choices](#14-architecture-patterns--why-we-made-these-choices)
15. [File-by-File Reference](#15-file-by-file-reference)

---

## 1. The Big Picture

### What is FlavorJet v2?

FlavorJet is a **premium restaurant ordering website** — think DoorDash meets a fine-dining restaurant's own platform. Users can:

- Browse a menu with categories and item details
- Customize items with modifiers (pizza size, burger extras, steak doneness)
- Add to cart, checkout, and track orders
- Search and filter menu items
- **Talk to an AI assistant** that can browse the menu, recommend food, and place orders via text or voice

### The Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | **Next.js 16** (App Router) | Server components, server actions, file-based routing |
| Styling | **Tailwind CSS v4** | Utility-first, fast, v4 has `@import "tailwindcss"` syntax |
| Database | **SQLite** via **better-sqlite3** | Zero setup, file-based, perfect for demos |
| ORM | **Drizzle ORM** | Type-safe SQL, lightweight, works great with SQLite |
| Auth | **Lucia v3** | Session-based auth, works with any DB adapter |
| AI | **Vercel AI SDK v6** | Streaming, tool calling, model-agnostic |
| AI Model | **Gemini 2.5 Flash** (swappable) | Free tier, fast, good at tool calling |
| Voice | **ElevenLabs** | STT (speech-to-text) and TTS (text-to-speech) |
| Images | **Cloudinary** | Profile picture uploads with auto-crop |
| Animation | **Framer Motion** | React animation library, smooth page transitions |
| Icons | **Lucide React** | Clean, consistent icon set |

### Why These Choices?

**Why SQLite instead of PostgreSQL?** — Zero infrastructure. No Docker, no cloud database. Clone the repo, run `npm install`, and it works. The `.db` file lives in `/data/flavorjet.db`. Perfect for a portfolio demo.

**Why Drizzle instead of Prisma?** — Drizzle is lighter (~30KB vs Prisma's ~2MB), generates no client code, and gives you raw SQL control. For a demo app, it's faster to set up and faster at runtime.

**Why Lucia instead of NextAuth?** — Lucia v3 gives you full control over sessions. No magic, no black boxes. You understand exactly how cookies, sessions, and user lookup work. Great for interviews when they ask "how does your auth work?"

**Why Vercel AI SDK instead of raw Gemini API?** — The AI SDK gives you streaming, tool calling, message history management, and model switching (Google/OpenAI/Anthropic) with one `getModel()` call. It abstracts the provider differences.

---

## 2. Project Setup & Config Files

### `package.json` — Your Dependencies

**Core dependencies:**
- `next`, `react`, `react-dom` — The framework
- `ai`, `@ai-sdk/react`, `@ai-sdk/google`, `@ai-sdk/openai`, `@ai-sdk/anthropic` — AI SDK v6 + providers
- `drizzle-orm`, `better-sqlite3` — Database
- `lucia`, `@lucia-auth/adapter-sqlite` — Authentication
- `framer-motion` — Animations
- `lucide-react` — Icons
- `cloudinary` — Image uploads
- `zod` — Schema validation (used by AI SDK tools)

**Dev dependencies:**
- `tailwindcss@4`, `@tailwindcss/postcss` — Styling
- `drizzle-kit` — DB migrations/schema push
- `@types/*` — TypeScript types

### `next.config.ts` — Next.js Configuration

The only custom config is `images.remotePatterns` — a whitelist of external image domains. Next.js blocks external images by default (security). Every domain your menu item images come from needs to be listed here:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "res.cloudinary.com" },    // Profile pics
    { protocol: "https", hostname: "images.unsplash.com" },   // Stock food photos
    { protocol: "https", hostname: "img.freepik.com" },       // More food photos
    // ... every domain that hosts food images
  ],
}
```

**Why not just allow all domains?** — Security. If you allow `*`, a malicious user could embed tracking pixels or harmful images.

### `tsconfig.json` — TypeScript Config

Key setting: `"paths": { "@/*": ["./src/*"] }` — This creates the `@/` import alias. Instead of `../../lib/auth`, you write `@/lib/auth`. Cleaner, and doesn't break when you move files around.

### `drizzle.config.ts` — Database Config

Tells Drizzle where your schema file is (`./src/db/schema.ts`), where to put migrations (`./drizzle`), and where the SQLite file lives (`./data/flavorjet.db`).

### `.env.local` — Environment Variables

```
CLOUDINARY_CLOUD_NAME=xxx       # For profile picture uploads
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
AI_PROVIDER=google              # "google" | "openai" | "anthropic"
GOOGLE_GENERATIVE_AI_API_KEY=xxx
ELEVENLABS_API_KEY=xxx          # Voice features (STT + TTS)
ELEVENLABS_VOICE_ID=xxx         # Which ElevenLabs voice to use
OPENWEATHERMAP_API_KEY=xxx      # Weather-based food recommendations
```

**CRITICAL: No `NEXT_PUBLIC_` prefix on any of these.** Variables without `NEXT_PUBLIC_` are server-only — they never reach the browser. This keeps API keys safe. The AI and voice features use server-side API route proxies to call external services.

---

## 3. Folder Structure — Why Things Are Where They Are

```
flavorjet-v2/
├── data/                          # SQLite database file
│   └── flavorjet.db
├── drizzle/                       # Auto-generated migration files
├── public/                        # Static files (images, videos, favicon)
│   └── videos/                    # Hero banner video clips
├── src/
│   ├── actions/                   # Server Actions (form handlers)
│   │   ├── auth-actions.ts        # Login, signup, logout
│   │   └── cart-actions.ts        # Cart CRUD, place order
│   ├── app/                       # Next.js App Router (pages & routes)
│   │   ├── (auth)/                # Route group (no URL segment)
│   │   │   ├── layout.tsx         # Auth-specific layout
│   │   │   └── login/page.tsx     # Login/Signup page
│   │   ├── api/                   # API routes
│   │   │   ├── chat/route.ts      # AI streaming endpoint
│   │   │   ├── stt/route.ts       # Speech-to-text proxy
│   │   │   ├── tts/route.ts       # Text-to-speech proxy
│   │   │   └── weather/route.ts   # Weather data proxy
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── menu/
│   │   │   ├── page.tsx                           # All categories
│   │   │   ├── search/page.tsx                    # Search page
│   │   │   ├── [categorySlug]/page.tsx            # Category items
│   │   │   └── [categorySlug]/[itemSlug]/page.tsx # Item detail
│   │   ├── orders/
│   │   │   ├── page.tsx           # Order history
│   │   │   └── [orderId]/page.tsx # Order detail
│   │   ├── profile/page.tsx
│   │   ├── layout.tsx             # ROOT layout (Navbar, Footer, ChatWidget)
│   │   ├── page.tsx               # Homepage
│   │   ├── globals.css            # Global styles & animations
│   │   ├── error.tsx              # Error boundary
│   │   ├── not-found.tsx          # 404 page
│   │   └── loading.tsx            # Root loading skeleton
│   ├── components/ 
│   │   ├── chat/                  # AI Assistant (13 files)
│   │   ├── home/                  # Homepage sections (8 files)
│   │   ├── layout/                # Navbar, Footer
│   │   ├── menu/                  # Menu-specific components
│   │   ├── cart/                  # Cart components
│   │   ├── checkout/              # Checkout components
│   │   ├── orders/                # Order components
│   │   ├── profile/               # Profile components
│   │   ├── search/                # Search filter components
│   │   ├── ui/                    # Shared UI (ToastProvider)
│   │   └── ThemeProvider.tsx      # Dark mode context
│   ├── db/
│   │   ├── index.ts               # Database connection singleton
│   │   ├── schema.ts              # All table definitions
│   │   └── seed.ts                # Sample data seeder
│   ├── lib/
│   │   ├── ai/                    # AI system (providers, prompts, tools)
│   │   │   ├── providers.ts       # Model registry (Gemini/GPT/Claude)
│   │   │   ├── system-prompt.ts   # Dynamic system prompt builder
│   │   │   └── menu-context.ts    # Token-optimized menu tools
│   │   ├── auth.ts                # Lucia setup + session management
│   │   ├── hash.ts                # Password hashing (scrypt)
│   │   ├── cloudinary.ts          # Image upload helper
│   │   ├── cart-utils.ts          # Cart count helper
│   │   ├── recommendations.ts     # Upsell recommendation engine
│   │   ├── search.ts              # Full-text menu search
│   │   └── utils.ts               # formatPrice, slugify, cn
│   └── types/
│       └── index.ts               # Shared TypeScript types
```

### Why separate `actions/` from `app/`?

Server Actions could live inside page files, but separating them into `actions/` means:
1. **Reusability** — `addToCart()` is called from the menu page, the AI chatbot, and the cart page
2. **Testability** — You can import and test actions independently
3. **Clarity** — Pages do rendering, actions do data mutations

### Why `components/chat/` has 13 files instead of one big component?

The chat widget started as one 600+ line file. We split it because:
1. **Each file has one job** — `VoiceOrb.tsx` only does canvas animation, `MessageBubble.tsx` only renders one message
2. **Easier debugging** — When voice breaks, you look at `VoicePanel.tsx`, not search through 600 lines
3. **Independent updates** — Redesigning the FAB button doesn't risk breaking message rendering

### Why `lib/ai/` is separate from `components/chat/`?

The `lib/ai/` folder contains **server-side logic** (system prompt, database queries, model config). The `components/chat/` folder contains **client-side UI**. They run in different environments:
- `lib/ai/` runs on Node.js (has access to database, env vars)
- `components/chat/` runs in the browser (has access to DOM, localStorage)

### Why route groups like `(auth)`?

The parentheses in `(auth)/` create a **route group** — it organizes files without affecting the URL. `src/app/(auth)/login/page.tsx` serves `/login`, not `/(auth)/login`. This lets you give auth pages their own layout (no navbar/footer) without changing URLs.

---

## 4. The Root Layout — Where Everything Starts

**File: `src/app/layout.tsx`**

This is the first file Next.js renders. Every single page on the site is wrapped by this layout. Here's what it does:

### Font Loading

```typescript
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});
```

`next/font/google` downloads Poppins at build time and self-hosts it. No Google Fonts CDN call at runtime = faster load, better privacy. The `variable` creates a CSS custom property `--font-poppins` that Tailwind uses.

### Server-Side Auth Check

```typescript
const { user } = await verifyAuth();
const cartCount = user ? getCartCountForUser(Number(user.id)) : 0;
```

This runs **on every page load** (it's in the root layout). It reads the session cookie, looks up the user, and gets their cart count. This data flows down to:
- `<Navbar>` — Shows username, profile pic, cart badge
- `<ChatWidget>` — Personalizes AI greeting ("Hey Goku!")

**Why in the layout and not in each page?** — Because the navbar and chat widget appear on EVERY page. If you put this in each page, you'd duplicate the auth check 15 times.

### The Dark Mode Flash Prevention Script

```html
<script dangerouslySetInnerHTML={{
  __html: `(function(){try{var t=localStorage.getItem('theme');
  if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches))
  {document.documentElement.classList.add('dark')}}catch(e){}})();`
}} />
```

This inline script runs **before React hydrates**. Without it, dark mode users would see a white flash:
1. Server renders HTML (no `dark` class — server doesn't know localStorage)
2. Page appears white
3. React hydrates, reads localStorage, adds `dark` class
4. Page turns dark

The inline script adds `dark` before any paint happens. The `dangerouslySetInnerHTML` is safe here because the content is hardcoded, not user input.

### Component Tree

```
<html>
  <body>
    <ThemeProvider>           ← Dark mode context
      <ToastProvider>         ← Toast notification context
        <Navbar />            ← Always visible
        <main>{children}</main>  ← Page content
        <Footer />            ← Always visible
        <ChatWidget />        ← AI assistant FAB (floating)
      </ToastProvider>
    </ThemeProvider>
  </body>
</html>
```

**Why is `ChatWidget` outside `<main>`?** — It's a floating overlay (position: fixed). It sits on top of all pages, not inside any page's content flow.

---

## 5. Database Layer — Drizzle ORM + SQLite

### The Connection: `src/db/index.ts`

```typescript
const globalForDb = globalThis as unknown as {
  _sqlite: ReturnType<typeof Database> | undefined;
};

if (!globalForDb._sqlite) {
  globalForDb._sqlite = new Database(dbPath);
  globalForDb._sqlite.pragma("journal_mode = WAL");
  globalForDb._sqlite.pragma("foreign_keys = ON");
}
```

**Why the `globalThis` pattern?** — Next.js dev server uses Hot Module Replacement (HMR). Every time you save a file, the module re-executes. Without this pattern, you'd create a new database connection on every save, eventually hitting the file lock limit. By storing the connection on `globalThis`, it persists across HMR reloads.

**What are the pragmas?**
- `journal_mode = WAL` — Write-Ahead Logging. Allows concurrent reads while writing. Without it, SQLite locks the entire DB during writes.
- `foreign_keys = ON` — Enforces foreign key constraints. SQLite doesn't enable this by default (historical quirk).
- `busy_timeout = 5000` — Wait up to 5 seconds if the DB is locked instead of immediately failing.
- `synchronous = NORMAL` — Balances durability and speed. `FULL` is safer but slower.

### The Schema: `src/db/schema.ts`

13 tables total. Here's how they relate:

```
users ─┬─ sessions (1:many — one user can have multiple login sessions)
       ├─ cartItems ─── cartItemModifiers (cart items with their chosen modifiers)
       └─ orders ─── orderItems ─── orderItemModifiers (order history)

categories ─── menuItems ─── modifierGroups ─── modifiers
```

**Key design decisions:**

1. **Prices stored in cents (integers)** — `price: integer("price")` stores $12.99 as `1299`. Floating point math is broken (`0.1 + 0.2 = 0.30000000000000004`). Integers avoid rounding errors. The `formatPrice()` helper converts to display: `$12.99`.

2. **Modifiers are separate tables** — Not JSON blobs. This allows:
   - Querying: "Which items have a 'Spicy' modifier?"
   - Price adjustments: Each modifier can add to the base price
   - Validation: `minSelect`/`maxSelect` constraints
   - Reusability: Same modifier group structure for different items

3. **Order items snapshot data** — `orderItems` stores `itemName` and `unitPrice` as copies, not references. Why? If you change a menu item's price, old orders should still show the price the customer paid.

4. **Cart deduplication** — Same item + same modifiers = increment quantity. Same item + different modifiers = new cart row. This is handled in `addToCart()`.

### The Seed Script: `src/db/seed.ts`

Populates the database with ~50 menu items across 9 categories. Run with:
```bash
npx tsx src/db/seed.ts
```

This creates real-looking data: Margherita Pizza ($14.99) with Size/Toppings/Crust modifiers, Classic Caesar Salad ($11.99) with Size/Protein/Dressing options, etc.

---

## 6. Authentication — Lucia v3

### How Sessions Work

Lucia is a session-based auth library. Here's the flow:

**Signup:**
1. User submits form → `signup()` server action
2. Password hashed with `scrypt` + random salt → stored in DB
3. Profile picture uploaded to Cloudinary
4. User row inserted → get `userId`
5. `lucia.createSession(String(userId), {})` → creates session row in `sessions` table
6. `lucia.createSessionCookie(session.id)` → creates a cookie with the session ID
7. Cookie set in browser → redirect to homepage

**Every page load:**
1. `verifyAuth()` reads the session cookie
2. Looks up the session in the `sessions` table
3. Joins with `users` table to get username/profile
4. Returns `{ user, session }` or `{ null, null }`

**Logout:**
1. `lucia.invalidateSession(session.id)` → deletes the session row
2. Sets a blank cookie → browser forgets the session

### Why a Direct SQL Query Instead of Lucia's `validateSession()`?

```typescript
const getSessionStmt = sqlite.prepare(`
  SELECT s.id as session_id, s.user_id, s.expires_at,
         u.username, u.profile_picture
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.id = ?
`);
```

Lucia's built-in `validateSession()` calls the adapter, which triggers database queries. During development with HMR, this occasionally caused hangs (the adapter would try to use a stale connection). The direct SQL query via `better-sqlite3` is synchronous, fast, and bypasses the adapter entirely.

### Password Hashing: `src/lib/hash.ts`

```typescript
const salt = crypto.randomBytes(16).toString("hex");
const hashedPassword = crypto.scryptSync(password, salt, 64);
return hashedPassword.toString("hex") + ":" + salt;
```

Uses Node.js built-in `crypto.scrypt` — no external dependency needed. The salt is stored alongside the hash, separated by `:`. Verification splits them apart and re-hashes with the same salt.

**Why not bcrypt?** — `bcrypt` requires a native module (`bcrypt` or `bcryptjs`). `scrypt` is built into Node.js, works everywhere, and is equally secure.

---

## 7. The Homepage

**File: `src/app/page.tsx`**

The homepage is composed of 7 sections, each a separate component:

```typescript
export default function Home() {
  return (
    <>
      <HeroBanner />
      <CategoriesSection />
      <ServicesSection />
      <AboutSection />
      <PopularMenuSection />
      <ChefsSection />
      <TestimonialsSection />
    </>
  );
}
```

**Why separate components instead of one big page?** — Each section is 100-250 lines. A single file would be 1000+ lines, impossible to navigate. Also, sections can be independently updated, lazy-loaded, or reused.

### HeroBanner — The Video Carousel

The hero is a full-viewport video slideshow with 6 food clips (steak, salmon, pizza, paella, sushi rolls, filet mignon).

**How the carousel works:**
1. All 6 videos are rendered in the DOM (layered with absolute positioning)
2. Only the current video has `opacity: 1`; others have `opacity: 0`
3. Every 7 seconds, a crossfade transition plays:
   - Text fades out (300ms)
   - Next video fades in (1200ms CSS transition)
   - Text fades in with staggered delays (subtitle, title, description, buttons)
4. A progress indicator at the bottom shows clickable slide dots

**Why pre-render all videos?** — Switching from one `<video>` src to another causes a loading delay. By having all videos in the DOM and toggling opacity, the transition is instant — the next video is already buffered.

**The overlay gradients:**
```
bg-gradient-to-r from-[#0f172b]/90 via-[#0f172b]/60 to-[#0f172b]/30
bg-gradient-to-t from-[#0f172b]/80 via-transparent to-[#0f172b]/40
```
Two gradient layers: horizontal (dark left → light right) and vertical (dark bottom → dark top). This ensures white text is readable on any video frame.

### CategoriesSection

A grid of category cards. Each card shows the category image, name, and item count. Clicking navigates to `/menu/[categorySlug]`. The data comes from a server component that queries the database directly — no API call needed.

### PopularMenuSection

Shows bestselling items with a tab interface to filter by category. Uses `PopularMenuTabs` (client component) for interactivity while `PopularMenuSection` (server component) fetches the data.

**Why this split?** — The tab UI needs `useState` (client-side), but the data fetch should happen on the server (faster, no loading state). This is the "server component fetches, client component renders" pattern.

### Other Sections

- **ServicesSection** — 4 service cards (Quality Food, Quick Delivery, 24/7 Service, Expert Chefs) with icons and descriptions
- **AboutSection** — Restaurant story with animated counters (years experience, menu items, happy customers)
- **ChefsSection** — Chef cards with photos and titles
- **TestimonialsSection** — Customer review carousel

---

## 8. Menu System — Categories, Items, Modifiers

### Category List: `/menu`

A server component that queries all categories and renders a responsive grid. Each card links to `/menu/[categorySlug]`.

### Category Items: `/menu/[categorySlug]`

A dynamic route. The `[categorySlug]` is a Next.js dynamic segment — it matches any URL like `/menu/burgers`, `/menu/pizza`, etc.

The page:
1. Looks up the category by slug
2. Queries all menu items in that category
3. Determines badges (Bestseller/Spicy/New) based on hardcoded slug sets
4. Renders a grid of item cards

**The badge system** (`menu-context.ts`):
```typescript
const BESTSELLER_SLUGS = new Set(["classic-beef-burger", "margherita-pizza", ...]);
const SPICY_SLUGS = new Set(["stuffed-jalapeno-poppers", "penne-arrabiata", ...]);
const NEW_SLUGS = new Set(["caprese-bruschetta", "mushroom-risotto", ...]);
```

Badges are determined by slug, not a database column. Why? Keeps the schema simpler. In production, you'd add a `badges` JSON column or a separate table.

**Quick Add vs Customize:**
- Items WITHOUT modifiers get a "Quick Add" button → calls `addToCart(itemId, 1)` directly
- Items WITH modifiers get a "Customize" link → navigates to the item detail page

### Item Detail: `/menu/[categorySlug]/[itemSlug]`

Two dynamic segments. The page:
1. Looks up the item by slug
2. Fetches all modifier groups and their options
3. Renders a sticky image (desktop) + modifier selection UI + quantity selector

**Modifier types:**
- **Required groups** (e.g., "Choose your size") — Must select at least `minSelect` options
- **Optional groups** (e.g., "Extra toppings") — Can select 0 to `maxSelect` options
- **Single select** (`maxSelect = 1`) — Radio buttons
- **Multi select** (`maxSelect > 1`) — Checkboxes

The `ModifierSelector` component handles all these variations with a single component using conditional rendering.

### Search: `/menu/search`

Full-text search with filters:
- Text query (searches name AND description)
- Category filter
- Price range (min/max)
- Rating filter
- Badge filter (bestseller, spicy, new)
- Sort options (price, rating, name)

The search logic lives in `src/lib/search.ts` and runs server-side. The `SearchFilters` component is a client-side sidebar/drawer that builds the query params.

---

## 9. Cart & Checkout

### Cart Page: `/cart`

The cart page is a server component that calls `getCart()` — a server action that:

1. Gets all cart items for the current user
2. Joins with `menuItems` for names/prices/images
3. For each cart item, fetches its modifiers from `cartItemModifiers`
4. Calculates `unitPrice` (base price + modifier adjustments) and `lineTotal` (unit price x quantity)

**Cart deduplication** — When you add "Classic Burger + Extra Cheese" twice, it becomes quantity 2 (not two rows). But "Classic Burger + Extra Cheese" and "Classic Burger + BBQ Sauce" are separate rows. The `addToCart()` function sorts modifier IDs and compares arrays to detect duplicates.

### Cart Recommendations

The `CartRecommendations` component suggests items from complementary categories:
```typescript
const CATEGORY_PAIRINGS = {
  burgers: ["appetizers", "desserts", "soups"],
  pizza: ["appetizers", "salads", "desserts"],
  // ...
};
```

If your cart has a burger, it suggests appetizers/desserts/soups. Items are sorted by rating so the best items appear first.

### Checkout: `/checkout`

The checkout page collects:
- Delivery address (with option to save to profile)
- Phone number
- Tip amount (preset buttons: $0, $3, $5, $10, or custom)

On submission, `placeOrder()` server action:
1. Reads the cart
2. Creates an `orders` row with total, address, tip, estimated delivery time
3. Creates `orderItems` rows (snapshots of item names/prices at purchase time)
4. Creates `orderItemModifiers` rows (snapshots of modifier names/prices)
5. Clears the cart
6. Redirects to `/orders/[orderId]`

**Why snapshot data?** — The order is a historical record. If the restaurant changes prices or renames items tomorrow, your past order should still show what you actually paid and what it was called when you ordered.

---

## 10. Order System

### Order History: `/orders`

Lists all orders for the current user, newest first. Each order shows:
- Order number
- Date
- Status badge (confirmed, preparing, delivering, delivered)
- Total amount
- Number of items

### Order Detail: `/orders/[orderId]`

Shows:
- Confirmation banner with estimated delivery time
- Item list with modifiers and prices
- Price breakdown (subtotal, tip, delivery fee, total)
- Timeline visualization showing order progress
- Delivery details

The `OrderTimeline` component shows status progression with animated dots/lines.

The `ReorderButton` component adds all items from a past order back to the cart.

---

## 11. The AI Assistant — The Star of the Show

This is the most complex part of the project. Let's break it down layer by layer.

### Architecture Overview

```
User speaks/types
       │
       ▼
┌─────────────────┐     ┌──────────────┐
│  ChatWidget.tsx  │────▶│ /api/chat    │  (streaming)
│  (orchestrator)  │     │  route.ts    │
└─────┬───────────┘     └──────┬───────┘
      │                        │
      │ Voice mode:            │ Tool calls:
      │ /api/stt (mic→text)    │ searchMenu()
      │ /api/tts (text→voice)  │ getCategoryItems()
      │                        │ getItemDetails()
      │                        │ getPopularItems()
      │                        │
      ▼                        ▼
┌─────────────┐        ┌──────────────┐
│ VoicePanel  │        │ menu-context  │
│ VoiceOrb    │        │ (DB queries)  │
│ Highlighting│        └──────────────┘
└─────────────┘
```

### Layer 1: Model Switching — `src/lib/ai/providers.ts`

```typescript
export const MODELS = {
  google:    { name: "Gemini 2.5 Flash",  model: google("gemini-2.5-flash") },
  openai:    { name: "GPT-4o Mini",       model: openai("gpt-4o-mini") },
  anthropic: { name: "Claude Sonnet 4",   model: anthropic("claude-sonnet-4-20250514") },
};

export function getModel() {
  const provider = (process.env.AI_PROVIDER || "google") as AIProvider;
  return MODELS[provider]?.model ?? MODELS.google.model;
}
```

Change `AI_PROVIDER=openai` in `.env.local`, restart the server, and the entire AI assistant now uses GPT-4o Mini. No code changes needed. The AI SDK abstracts away all provider differences.

**Why is this important for interviews?** — It shows you understand abstraction and provider-agnostic design. In production, you might switch models based on cost, latency, or feature requirements.

### Layer 2: Token-Optimized System Prompt — `src/lib/ai/system-prompt.ts`

The system prompt is ~800 tokens. A naive approach would dump the entire menu (~3000-4000 tokens) into the prompt. Instead:

```typescript
return `You are FlavorJet's AI ordering assistant. Respond ONLY in ${lang}.
CATEGORIES: ${categoryList}   // Just names: "Appetizers, Salads, Soups, ..."
USE TOOLS to look up menu items.  // AI calls tools ON DEMAND
...`;
```

**Token savings:** The system prompt only lists category names (~50 tokens). When a user says "show me burgers," the AI calls the `get_category_items` tool, which queries the database and returns only the burger items. This saves ~3000 tokens per request.

**Dynamic weather context:**
```typescript
const weatherBlock = weather
  ? `\nWEATHER: ${weather.temp}°F, ${weather.description}. ${
      weather.temp > 75 ? "Suggest cold/refreshing items." :
      weather.temp < 55 ? "Suggest warm/comfort items." : ""
    }`
  : "";
```

If the user allowed location access and it's 90°F, the AI knows to suggest salads and cold drinks instead of hot soup.

### Layer 3: Menu Tools — `src/lib/ai/menu-context.ts`

Four tool functions that query the database:

1. **`searchMenu(query)`** — Keyword search by name, then by description as fallback. Returns up to 8 items.
2. **`getCategoryItems(categoryName)`** — All items in a category. Uses `LIKE` for fuzzy matching ("burger" matches "Burgers").
3. **`getItemDetails(itemId)`** — Full item info including modifier groups and options.
4. **`getPopularItems()`** — Top 8 items sorted by rating.

Each function returns structured `MenuItemResult` objects (not formatted text). This structured data is:
- Sent to the AI model as JSON (so it can reason about prices, IDs, etc.)
- Also available to the UI for rendering `MenuItemCard` components with images, ratings, prices

**The `formatItem()` helper** creates a `MenuItemResult` with:
- Basic info (name, price, rating, description)
- Navigation info (categorySlug, itemSlug for URLs)
- Badge ("Bestseller", "Spicy", "New")
- Modifier flag (`hasModifiers`) and customize URL
- Image URL for card rendering

### Layer 4: The Chat API Route — `src/app/api/chat/route.ts`

This is where AI SDK v6 does its magic:

```typescript
const result = streamText({
  model: getModel(),
  system: systemPrompt,
  messages: modelMessages,
  maxOutputTokens: 1024,
  temperature: 0.7,
  stopWhen: stepCountIs(5),  // Allow up to 5 tool calls per request
  tools: { search_menu, get_category_items, get_item_details, get_popular_items },
});
return result.toUIMessageStreamResponse();
```

**What happens when a user says "Show me burgers":**
1. Client sends the message to `/api/chat`
2. `streamText()` sends the conversation to the AI model
3. Model decides to call `get_category_items({ category: "Burgers" })`
4. The SDK runs the `execute` function, which queries the database
5. Tool result is sent back to the model
6. Model generates a response like "Here are our burgers! 🍔 ..."
7. Response streams back to the client token by token

**Message history compression:**

```typescript
function optimizeUIHistory(messages, keepLast = 8) {
  if (messages.length <= keepLast) return messages;
  // Compress older messages into a summary
  // Keep last 8 messages intact
}
```

Long conversations would send thousands of tokens of history. This function keeps only the last 8 messages and compresses older ones into a brief summary like:
```
[Earlier: User discussed: "show me burgers", "add the classic one", "what about desserts?"]
```

This saves ~200-500 tokens per request on long conversations.

**UIMessage to ModelMessage conversion:**

AI SDK v6 has two message formats:
- `UIMessage` — What the client sends (has `parts[]` array with text, tool results, etc.)
- `ModelMessage` — What the AI model expects

`convertToModelMessages()` bridges them. This is a v6-specific requirement — older versions used the same format everywhere.

### Layer 5: The Chat Widget — `src/components/chat/ChatWidget.tsx`

This is the **orchestrator** — it manages all state and delegates rendering to child components.

**State it manages:**
- `isOpen`, `isMinimized` — Widget visibility
- `hasOnboarded` — Has user completed the mode picker?
- `mode` — "chat" or "voice"
- `language` — Currently selected language (25+ options)
- `weather` — User's local weather (for recommendations)
- `voiceState` — "idle" | "listening" | "processing" | "speaking"
- `analyserNode` — Web Audio API analyser for voice visualization
- `pendingOrder` — Items waiting for cart confirmation
- `pendingModifiers` — Modifier selection in progress
- `tokenUsage` — Debug info (input/output tokens)
- `suggestions` — Quick-reply chip suggestions

**The `useChat` hook (AI SDK v6):**

```typescript
const { messages, sendMessage, status, setMessages } = useChat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
    body: { language, weather },
  }),
  onFinish: ({ message }) => {
    // Check for ITEMS: marker → show order card
    // Check for MODIFIERS: marker → show modifier picker
    // Update voice panel with response text
    // Trigger TTS in voice mode
  },
});
```

Key v6 differences from older versions:
- `sendMessage({ text })` instead of `handleSubmit()`
- `status` ("submitted" | "streaming" | "ready") instead of `isLoading`
- `DefaultChatTransport` for custom API URL and body params
- `UIMessage` with `parts[]` instead of `content` string

**The ITEMS: marker pattern:**

When the AI confirms an order, it outputs a hidden marker:
```
Great choice! I've got your order ready. 🎉

ITEMS:5:2;12:1
```

The `onFinish` callback parses this marker, extracts item IDs and quantities, and shows an `OrderConfirmCard`. The marker is stripped from the displayed text by `cleanMarkers()`.

### Layer 6: Voice Mode

Voice is "50% of the assistant." The flow:

**Speech-to-Text (STT):**
1. User taps mic → `startListening()`
2. Browser requests microphone access → `getUserMedia({ audio: true })`
3. Audio is recorded via `MediaRecorder` API
4. Web Audio API creates an `AnalyserNode` from the mic stream (for visualizing the waveform)
5. When user taps mic again (or after 30s timeout) → `recorder.stop()`
6. Audio blob is sent to `/api/stt` → proxied to ElevenLabs' Scribe v1
7. Transcribed text is sent to the AI via `handleSendText()`

**Text-to-Speech (TTS):**
1. AI responds → `speakText()` called
2. Text sent to `/api/tts` → proxied to ElevenLabs' Turbo v2.5
3. Audio blob played via `new Audio(url)`
4. Web Audio API creates an `AnalyserNode` from the audio element (for visualizing the playback)
5. When audio ends → state resets to idle

**Why server-side proxies for STT/TTS?** — The ElevenLabs API key must stay secret. If it were in the browser (`NEXT_PUBLIC_ELEVENLABS_API_KEY`), anyone could open DevTools and steal it. The proxy routes in `/api/stt` and `/api/tts` keep the key on the server.

### Layer 7: The Voice UI Components

**VoiceOrb** — A canvas-based 3D mesh waveform visualization:
- 5 layered wave curves using sine functions
- Vertical cross-hatching mesh lines
- Gold gradient coloring
- Audio-reactive: uses `AnalyserNode.getByteFrequencyData()` to modulate wave amplitude based on actual audio
- States: idle (slow breathing), listening (reactive to mic), processing (spinner dots), speaking (reactive to TTS audio)

**VoicePanel** — The full voice-mode UI:
- Dark gradient background
- VoiceOrb centered on screen
- `HighlightedText` component for word-by-word karaoke effect during TTS:
  - Splits response text into words
  - Tracks `audio.currentTime / audio.duration` percentage
  - Read words = white, current word = gold (#fea116), unread words = gray
- Transcript display (what user said)
- Mic button with ping animation when listening

### Layer 8: The Message UI Components

**MessageBubble** — Each chat message:
- User messages: Gold gradient bubble, aligned right
- Bot messages: White bubble with gold border, aligned left, with a gold Bot avatar icon
- Parses tool result parts from the AI response to extract menu items
- Renders a horizontal scrollable row of `MenuItemCard` components when items are found
- `FormatText` helper handles `**bold**` markdown in AI responses
- Streaming cursor (pulsing gold bar) while AI is still generating

**MenuItemCard** — Rich food item preview:
- Food image (via next/image with optimization)
- Badge (Bestseller/Spicy/New with matching colors)
- Rating star with score
- Price in bold gold
- Quick Add button (for items without modifiers) or Customize button (with chevron)

**SuggestionChips** — Quick-reply buttons that appear on first load:
- "What's popular?", "Show me burgers", "Something under $12", "Recommend for me"
- Staggered fade-in animation
- Disappear after the user sends any message

**OrderConfirmCard** — When the AI outputs ITEMS: marker:
- Shows order summary with item names and quantities
- "Add to Cart" button with gold gradient
- "Cancel" button
- Loading spinner during cart API call

**ModifierPicker** — Multi-step modifier selection:
- Progress dots showing current group
- Option cards for each modifier
- Confirm/Cancel buttons
- In voice mode, options are spoken aloud

### Layer 9: The Onboarding Flow

**ChatOnboarding** — First-time experience:
- Step 1: Choose mode (Chat or Voice) with animated cards
- Step 2: Tips and prerequisites for the chosen mode
  - Chat mode: "Type naturally, ask about any dish, say 'add to cart'"
  - Voice mode: "Allow microphone access, speak clearly, tap to start/stop"
- Saves preference to localStorage

---

## 12. Styling & Tailwind v4

### How Tailwind v4 Works

Tailwind v4 is different from v3. Instead of `tailwind.config.js`, you configure directly in CSS:

```css
@import "tailwindcss";

@theme inline {
  --color-primary: #fea116;
  --color-dark: #0f172b;
  --font-poppins: var(--font-poppins);
}
```

**CRITICAL: The `@layer` rule.** Tailwind v4 generates utilities inside CSS `@layer` blocks. If you write unlayered CSS like `* { margin: 0; }`, it overrides ALL Tailwind utilities because unlayered CSS has higher specificity than `@layer` CSS. Custom styles MUST go in `@layer base {}` or `@layer utilities {}`.

### Custom Animations

All custom animations are defined in `globals.css`:

- **`fabPulseGlow`** — Pulsing gold shadow on the FAB button
- **`fabRipple`** — Expanding ring animation (two rings, staggered)
- **`fabFloat`** — Gentle up/down floating
- **`fabBotBlink`** — The bot icon "blinks" every 4 seconds
- **`voicePulse`** — Expanding shadow ring on the mic button
- **`shimmerGold`** — Gold gradient moving across text
- **`chatPanelGlow`** — Ambient gold glow on the chat panel border

Each animation has a matching utility class (e.g., `.ai-fab-glow`, `.voice-pulse`, `.gold-shimmer`).

### Color System

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#fea116` | Buttons, accents, highlights, badges |
| Primary Light | `#f3c156` | Hover states, secondary accents |
| Dark | `#0f172b` | Navbar, dark mode background, text on gold |
| Light | `#f1f8ff` | Light background tint |
| Warm BG | `#fef9f0` | Chat messages area background tint |

The gold/dark navy combination gives a "premium dining" feel throughout.

---

## 13. Dark Mode System

### How It Works

1. **Blocking script in `<head>`** — Reads localStorage before paint, adds `dark` class to `<html>`
2. **ThemeProvider** — React context with `theme` state and `toggleTheme()` function
3. **Tailwind dark: variant** — `@custom-variant dark (&:where(.dark, .dark *))` enables `dark:` prefixes
4. **Toggle button in Navbar** — Sun/Moon icon that calls `toggleTheme()`

### The Provider Pattern

```typescript
export default function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    // Sync state with what the blocking script set
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);
}
```

**Why not just read localStorage in the provider?** — The provider is a client component. It hydrates AFTER the initial paint. The blocking `<script>` in `<head>` runs BEFORE paint. The provider syncs with whatever the script already set.

---

## 14. Architecture Patterns & Why We Made These Choices

### Pattern 1: Server Components for Data, Client Components for Interactivity

```
Server Component (page.tsx)          Client Component (SomeWidget.tsx)
├── Queries database directly         ├── Has useState, useEffect
├── No JavaScript sent to browser     ├── Handles clicks, forms
├── Can use async/await at top level  ├── Needs "use client" directive
└── Passes data as props              └── Receives data via props
```

Example: `PopularMenuSection` (server) fetches menu items, passes them to `PopularMenuTabs` (client) which renders tabs and handles click events.

### Pattern 2: Server Actions for Mutations

Instead of API routes for form handling, we use Server Actions:

```typescript
// src/actions/cart-actions.ts
"use server";

export async function addToCart(menuItemId: number, quantity: number = 1) {
  const userId = await requireUser();
  // ... database operations ...
  revalidatePath("/", "layout");
  return { success: true };
}
```

Called from client components:
```typescript
const result = await addToCart(item.id, 1);
```

**Why not API routes?** — Server Actions are simpler. No `fetch()`, no request/response parsing, no URL management. They're just async functions that run on the server. Next.js handles the RPC plumbing.

**When DO we use API routes?** — For streaming (chat), proxying external APIs (STT, TTS, weather), and anything that needs custom headers/status codes.

### Pattern 3: Composition Over Configuration

The chat widget uses composition — each piece is a focused component:

```
ChatWidget (orchestrator — manages state)
├── ChatOnboarding (first-time flow)
├── ChatHeader (mode switch, settings)
├── ChatMessages (message list)
│   ├── MessageBubble (single message)
│   │   └── MenuItemCard (food card)
│   ├── SuggestionChips (quick replies)
│   ├── OrderConfirmCard (order review)
│   └── ModifierPicker (customization)
├── ChatInput (text + mic)
└── VoicePanel (voice mode)
    └── VoiceOrb (waveform canvas)
```

Each component receives only the props it needs. `VoiceOrb` doesn't know about cart state. `MenuItemCard` doesn't know about voice mode. This isolation makes each component testable and debuggable independently.

### Pattern 4: Token Optimization Architecture

Traditional chatbot: stuff the entire menu into the system prompt (~4000 tokens per request).

FlavorJet's approach: system prompt has only category names (~50 tokens). AI calls tools on-demand:

```
Request 1: "What's popular?"
  System prompt: ~800 tokens
  + get_popular_items result: ~400 tokens (only 8 items)
  Total: ~1200 tokens

vs. Traditional:
  System prompt with full menu: ~4000 tokens
  Total: ~4000 tokens
```

Over a 10-message conversation, this saves ~30,000 tokens.

### Pattern 5: The Marker Pattern for Cart Integration

The AI outputs machine-readable markers in its response text:

```
Sounds great! I'll add those to your cart. 🎉

ITEMS:5:2;12:1
```

The client extracts `ITEMS:5:2;12:1`, parses it to `[{id: "5", qty: 2}, {id: "12", qty: 1}]`, and shows an order confirmation card. The marker text is stripped from the displayed message.

**Why not a tool call for adding to cart?** — The cart operation needs user confirmation. If the AI called a `add_to_cart` tool directly, items would be added without asking. The marker pattern lets the UI show a confirmation step first.

### Pattern 6: Proxy Routes for API Key Security

```
Browser → /api/tts → ElevenLabs API
         (our server)

NOT: Browser → ElevenLabs API (exposes API key!)
```

Every external API call with a secret key goes through our own API route. The browser never sees the key.

---

## 15. File-by-File Reference

### Quick Reference: Every File and Its Purpose

| File | Purpose |
|------|---------|
| **Config** | |
| `next.config.ts` | Image domains whitelist |
| `drizzle.config.ts` | DB schema/migration paths |
| `tsconfig.json` | TypeScript config with `@/` alias |
| `.env.local` | Secret keys (server-only) |
| **Database** | |
| `src/db/index.ts` | SQLite connection singleton (HMR-safe) |
| `src/db/schema.ts` | 13 table definitions (users, menu, cart, orders) |
| `src/db/seed.ts` | Sample data: 9 categories, ~50 items, modifiers |
| **Auth** | |
| `src/lib/auth.ts` | Lucia setup, session CRUD, cookie management |
| `src/lib/hash.ts` | scrypt password hashing |
| `src/actions/auth-actions.ts` | login(), signup(), logout(), getUserProfile() |
| **Core Lib** | |
| `src/lib/utils.ts` | formatPrice(), slugify(), cn() |
| `src/lib/cloudinary.ts` | Image upload to Cloudinary |
| `src/lib/cart-utils.ts` | getCartCountForUser() for navbar badge |
| `src/lib/recommendations.ts` | Category pairing upsell engine |
| `src/lib/search.ts` | Full-text menu search with filters |
| **AI System** | |
| `src/lib/ai/providers.ts` | Model registry (Google/OpenAI/Anthropic) |
| `src/lib/ai/system-prompt.ts` | Dynamic ~800-token system prompt |
| `src/lib/ai/menu-context.ts` | 4 tool functions for on-demand menu queries |
| **API Routes** | |
| `src/app/api/chat/route.ts` | Streaming AI chat with tool calling |
| `src/app/api/stt/route.ts` | ElevenLabs STT proxy |
| `src/app/api/tts/route.ts` | ElevenLabs TTS proxy |
| `src/app/api/weather/route.ts` | OpenWeatherMap proxy with 30min cache |
| **Server Actions** | |
| `src/actions/cart-actions.ts` | addToCart(), getCart(), placeOrder(), etc. |
| `src/actions/auth-actions.ts` | Login, signup, logout |
| **Pages** | |
| `src/app/layout.tsx` | Root layout (Navbar + Footer + ChatWidget) |
| `src/app/page.tsx` | Homepage (7 sections) |
| `src/app/(auth)/login/page.tsx` | Login/Signup with image upload |
| `src/app/menu/page.tsx` | Category grid |
| `src/app/menu/[categorySlug]/page.tsx` | Items in a category |
| `src/app/menu/[categorySlug]/[itemSlug]/page.tsx` | Item detail + modifiers |
| `src/app/menu/search/page.tsx` | Search with filters |
| `src/app/cart/page.tsx` | Shopping cart |
| `src/app/checkout/page.tsx` | Checkout form |
| `src/app/orders/page.tsx` | Order history |
| `src/app/orders/[orderId]/page.tsx` | Order detail |
| `src/app/profile/page.tsx` | User profile & address |
| **Chat Components** | |
| `src/components/chat/types.ts` | Shared types, helpers, marker parsers |
| `src/components/chat/ChatWidget.tsx` | Main orchestrator (state, voice, cart) |
| `src/components/chat/ChatOnboarding.tsx` | First-time mode picker |
| `src/components/chat/ChatHeader.tsx` | Mode switch, language, settings |
| `src/components/chat/ChatMessages.tsx` | Message list container |
| `src/components/chat/ChatInput.tsx` | Text input + image upload + mic |
| `src/components/chat/MessageBubble.tsx` | Single message with bot avatar + cards |
| `src/components/chat/MenuItemCard.tsx` | Food item card (image, badge, price) |
| `src/components/chat/VoicePanel.tsx` | Voice mode UI + word highlighting |
| `src/components/chat/VoiceOrb.tsx` | Canvas 3D mesh waveform |
| `src/components/chat/SuggestionChips.tsx` | Quick-reply buttons |
| `src/components/chat/OrderConfirmCard.tsx` | Order review + confirm |
| `src/components/chat/ModifierPicker.tsx` | Multi-step modifier selection |
| `src/components/chat/TokenBadge.tsx` | Debug token usage display |
| **Layout Components** | |
| `src/components/layout/Navbar.tsx` | Nav + cart badge + profile + theme toggle |
| `src/components/layout/Footer.tsx` | Footer links |
| `src/components/ThemeProvider.tsx` | Dark mode context provider |
| `src/components/ui/ToastProvider.tsx` | Toast notifications |
| **Home Components** | |
| `src/components/home/HeroBanner.tsx` | Video carousel with crossfade |
| `src/components/home/CategoriesSection.tsx` | Category grid |
| `src/components/home/ServicesSection.tsx` | Service feature cards |
| `src/components/home/AboutSection.tsx` | Restaurant story + counters |
| `src/components/home/PopularMenuSection.tsx` | Featured items (server) |
| `src/components/home/PopularMenuTabs.tsx` | Category tabs (client) |
| `src/components/home/ChefsSection.tsx` | Chef team cards |
| `src/components/home/TestimonialsSection.tsx` | Review carousel |
| `src/components/home/AnimatedCounter.tsx` | Number count-up animation |
| **Menu Components** | |
| `src/components/menu/ModifierSelector.tsx` | Radio/checkbox modifier UI |
| `src/components/menu/AddToCartButton.tsx` | Add to cart with modifiers |
| `src/components/menu/QuickAddButton.tsx` | One-click add (no modifiers) |
| `src/components/menu/SearchBar.tsx` | Search input component |
| **Cart Components** | |
| `src/components/cart/CartItemCard.tsx` | Cart item with edit/remove |
| `src/components/cart/CartRecommendations.tsx` | Upsell suggestions |
| `src/components/cart/PlaceOrderButton.tsx` | Checkout CTA |
| **Checkout Components** | |
| `src/components/checkout/CheckoutForm.tsx` | Main checkout container |
| `src/components/checkout/AddressForm.tsx` | Address input fields |
| `src/components/checkout/TipSelector.tsx` | Tip amount picker |
| **Order Components** | |
| `src/components/orders/OrderTimeline.tsx` | Status progression |
| `src/components/orders/ReorderButton.tsx` | Re-add past order items |
| **Other** | |
| `src/components/profile/ProfileAddressForm.tsx` | Profile edit form |
| `src/components/search/SearchFilters.tsx` | Search filter sidebar |
| `src/app/globals.css` | Theme, animations, utility classes |

---

## Glossary

| Term | Meaning |
|------|---------|
| **Server Component** | React component that runs only on the server. Can directly query DB, read files. No `useState` allowed. |
| **Client Component** | React component with `"use client"` directive. Runs in browser. Can use hooks, event handlers. |
| **Server Action** | Async function with `"use server"` directive. Called from client, runs on server. Used for mutations. |
| **Route Group** | Folder in parentheses like `(auth)`. Organizes files without affecting URLs. |
| **Dynamic Segment** | Folder in brackets like `[categorySlug]`. Captures URL parameters. |
| **Tool Calling** | AI can invoke predefined functions (search menu, get details) during response generation. |
| **Streaming** | AI response sent token-by-token as generated, not all at once. Feels faster. |
| **UIMessage** | AI SDK v6 message format with `parts[]` array (text + tool results). |
| **System Prompt** | Hidden instruction text that shapes AI behavior. User never sees it. |
| **HMR** | Hot Module Replacement. Dev server reloads changed files without full page refresh. |
| **WAL** | Write-Ahead Logging. SQLite mode that allows concurrent reads during writes. |
| **SSR** | Server-Side Rendering. Page HTML generated on the server for each request. |
| **Hydration** | React takes over server-rendered HTML and makes it interactive. |

---

*This guide covers every file, every pattern, and every architectural decision in FlavorJet v2. If an interviewer asks "how does X work?", the answer is in here.*
