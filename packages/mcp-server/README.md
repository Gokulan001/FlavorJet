# @flavorjet/mcp-server

An MCP server that exposes FlavorJet's **ordering domain** to any MCP client
(Claude Desktop, Cursor, the Inspector, or a custom agent) over **stdio**.

It imports the same framework-agnostic domain core (`src/lib/core/*`) the Next.js
app uses — no HTTP hop, no duplicated logic. Identity is injected (`userId`), not
read from cookies.

## Capabilities (V1 — traditional ordering)

**Tools**
- `ping` — health check
- `find_items_by_name`, `browse_category` — menu search (local SQLite)
- `get_modifiers` — item customization options; returns **`structuredContent`** (typed `{id,name,priceAdjustmentCents}`) so the model passes ids reliably to `add_to_cart`
- `login`, `whoami`, `logout` — session auth (full lifecycle; `logout` clears the in-memory session **and** deletes the DB session row)
- `add_to_cart` (accepts `modifierIds`), `view_cart`, `update_cart_quantity`, `remove_from_cart` — cart (requires login)
- `update_cart_modifiers` — edit an in-cart item's customization **in place** (by `cartItemId` from `view_cart`); pass the full new modifier id set. Requires login
- `place_order` — checkout with **elicitation** when the client supports forms; **gracefully falls back** to accepting `street/city/zip/phone/tip` as arguments on clients that don't (e.g. Claude Desktop)
- `get_order_history` — past orders (requires login)

**Resources**
- `flavorjet://menu/categories` — all categories
- `flavorjet://menu/item/{slug}` — item detail (dynamic template)

**Prompts**
- `meal_planner` — slash-command meal planner

> Phase 2 (not built): semantic/Pinecone search, recommendations, image/voice,
> remote Streamable HTTP transport + OAuth.

## Setup

```bash
# from repo root
npm install
npx tsx packages/mcp-server/scripts/seed-demo-user.ts   # creates demo / demo1234
```

Secrets are read from the repo-root `.env.local` (loaded by `src/env.ts`).
Menu/cart/order data is local SQLite (`data/flavorjet.db`).

## Run / verify

```bash
cd packages/mcp-server

npm start                       # launch over stdio (waits for a client)
npm run inspect                 # MCP Inspector UI (open the printed token URL)
npx tsx src/_check.ts           # quick in-process smoke of every tool

# automated test — run from the REPO ROOT (vitest.setup.ts lives there):
cd ../.. && npx vitest run packages/mcp-server/src/server.test.ts
```

## Use in Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS), then restart Claude Desktop:

```json
{
  "mcpServers": {
    "flavorjet": {
      "command": "/ABSOLUTE/PATH/TO/node/bin/npm",
      "args": [
        "--silent",
        "--prefix",
        "/Users/gokulan.periasamy/projects/flavorjet-v2 3/packages/mcp-server",
        "run",
        "start"
      ],
      "env": {
        "PATH": "/ABSOLUTE/PATH/TO/node/bin:/usr/bin:/bin:/usr/sbin:/sbin"
      }
    }
  }
}
```

> **Two gotchas (learned the hard way):**
> - Claude Desktop launches with a **minimal PATH** and won't find a shell-managed `npm` (nvm/asdf/etc.). Use the **absolute** `command` path and inject `env.PATH` so `npm` can find `node`/`tsx`. (Find yours with `which npm` / `which node`.)
> - **`--silent`** suppresses npm's `> name@ver start` banner, which otherwise prints to **stdout** and corrupts the JSON-RPC stream (`Unexpected token '>'… is not valid JSON`).

Then chat, e.g.:
> "Log me in as demo (password demo1234), add a margherita pizza, and place my order."

Claude calls `login` → `add_to_cart` → `place_order`. On a **form-capable client** an
elicitation **form** collects the delivery address + tip; on **Claude Desktop** (no form
support) `place_order` **gracefully degrades** — the model supplies the address as tool
arguments instead. Either way the order is placed.

## Architecture notes

- **stdio = one process per client** → session is held in a per-server closure
  variable and re-validated against the `sessions` table on every authenticated call.
- **No `console.log`** in the server — stdout carries JSON-RPC. Logs go to stderr.
- Read tools are public; cart/order tools are gated behind `login` (a thrown error
  in `requireUserId()` becomes an error result).
- **Direct domain-core calls, not HTTP** — the server imports `src/lib/core/*` (the same
  pure logic the Next.js app uses). Identity is injected (`userId`), never read from cookies.
- **Elicitation graceful degradation** — `place_order` `try`s a form, and on clients that
  don't advertise `elicitation.form` (e.g. Claude Desktop) falls back to optional tool
  arguments. Designed for the lowest common denominator; richer clients light up the form.
- **`structuredContent` + `outputSchema`** on data tools the model consumes downstream
  (`view_cart` carries `cartItemId` for `update_cart_modifiers`; `get_modifiers` carries
  option ids for `add_to_cart`) — so the model never parses ids out of free text.
- **Auth is app-level only** (login/session). No *transport* auth needed because stdio is a
  local subprocess; a remote Streamable HTTP transport would add OAuth on top.

## Not built (deliberate scope)

Phase 2 / future, intentionally out of scope for this portfolio piece:
- Semantic/Pinecone search + recommendations (RAG breadth, not new MCP depth).
- Remote **Streamable HTTP** transport + **OAuth** (the multi-user story).
- **Sampling** (server asks the client's LLM to generate, e.g. a recommend-a-meal tool).
- A standalone MCP **client/host** (would demonstrate the consuming end of the protocol).
