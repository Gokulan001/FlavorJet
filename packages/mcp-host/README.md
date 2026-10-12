# @flavorjet/mcp-host

A command-line **MCP host**: it connects to multiple MCP servers, merges their tools into a
single registry, and drives an agentic tool-calling loop against Claude (Anthropic API). It also
implements the client-side handlers for two server-initiated MCP requests — **elicitation**
(interactive forms) and **sampling** (letting a server ask the host's LLM to generate on its behalf).

## What it does

- Connects to every server in its static registry over stdio and lists their tools.
- Merges all servers' tools into one registry, namespaced `serverId:toolName` (sent to Claude as `serverId__toolName` — see [Agent loop](#agent-loop)).
- Runs an agent loop against a fixed model (`claude-haiku-4-5`) — call Claude, execute any requested tool calls, feed results back — until Claude stops requesting tools.
- Answers `elicitation/create` requests with an interactive CLI form.
- Answers `sampling/createMessage` requests by calling Claude on the server's behalf.

## Connected servers

| id          | command                                                    | purpose                                                                                            |
| ----------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `flavorjet` | `npx tsx ../mcp-server/src/stdio.ts`                       | FlavorJet ordering domain — menu, cart, auth, orders. See [`mcp-server`](../mcp-server/README.md). |
| `fs`        | `npx -y @modelcontextprotocol/server-filesystem ./sandbox` | Official MCP reference filesystem server, scoped to [`sandbox/`](./sandbox).                       |

> Both are child processes spawned by this host on startup — you don't run `mcp-server` yourself.
> `fs` uses `npx -y` because `@modelcontextprotocol/server-filesystem` is a fetched package, not a repo dependency; `flavorjet` runs straight from source via `tsx`.

## Requirements

- Node 22 and npm workspaces (dependencies are installed from the repo root).
- `ANTHROPIC_API_KEY` in the repo-root `.env.local` (`ANTHROPIC_BASE_URL` is optional — see [`.env.example`](../../.env.example)).
- A seeded demo user to exercise the authenticated `flavorjet` tools (`login`, `add_to_cart`, `place_order`, `get_order_history`): `npx tsx packages/mcp-server/scripts/seed-demo-user.ts` — see [`mcp-server`'s README](../mcp-server/README.md).
- Network access on first run so `npx -y` can fetch `@modelcontextprotocol/server-filesystem`.

## Setup

```bash
# from repo root
npm install
cp .env.example .env.local   # fill in ANTHROPIC_API_KEY (ANTHROPIC_BASE_URL optional)
```

## Usage

```bash
cd packages/mcp-host
npm start -- "Log in as demo (password demo1234), add a margherita pizza, and show my cart."
```

The query is read from `argv[2]`; omit it to run the default (`"Ping the flavorjet server."`):

```bash
npm start -- "List the files in the sandbox directory."     # exercises the fs server
npm start -- "Browse the pizza category and recommend two items for one person."
```

Assistant text streams to stdout as it's generated; connection, tool-call, and sampling logs go
to stderr — so `npm start -- "..." 2>/dev/null` prints just the final transcript. Illustrative
example for the default query (stdout and stderr interleaved as they'd appear in a terminal):

```text
Query: Ping the flavorjet server.

[tool] flavorjet__ping
pong
```

## Agent loop

1. The CLI query becomes the first `user` message.
2. The host streams a completion from Claude with the full merged tool list attached, writing text deltas to stdout as they arrive.
3. If the response's `stop_reason` is `tool_use`, the host runs every requested tool against the server that owns it, wraps each result as a `tool_result` block (`is_error: true` on failure or an unknown tool name), and appends them as one new `user` turn.
4. Steps 2–3 repeat until `stop_reason` is no longer `tool_use`; every client then disconnects and the process exits.

Claude tool names must match `^[a-zA-Z0-9_-]{1,128}$`, so the registry key `serverId:toolName` is
sent to Claude as `serverId__toolName` and converted back when a tool call comes in (e.g.
`flavorjet__ping` → `flavorjet:ping`).

## Elicitation (interactive forms)

When a connected server sends an `elicitation/create` request (e.g. `flavorjet`'s `place_order`
asking for a delivery address), the host:

1. Prints the request message to stderr.
2. Prompts for every field in the requested JSON Schema via `readline`, labeling non-required fields `(optional)`.
3. Parses `type: "number"` fields with `parseFloat`.
4. Returns `{ action: "accept", content }` to the server.

## Sampling (server delegates generation to the host)

When a server sends a `sampling/createMessage` request, the host forwards its messages and system
prompt to Claude (`claude-haiku-4-5`) and returns the completion — so a server can request LLM
generation without holding its own API key.

## Project layout

```
mcp-host/
├── package.json
├── tsconfig.json
├── sandbox/        # scratch root exposed to the fs server — safe to read/write test files here
└── src/
    └── index.ts     # server registry, elicitation + sampling handlers, agent loop
```

## Known limitations

- Model is hardcoded to `claude-haiku-4-5` for both the agent loop and sampling responses.
- One query per process — no persisted conversation history across runs.
- No automated tests (compare [`mcp-server/src/server.test.ts`](../mcp-server/src/server.test.ts)).

## Related

- [`packages/mcp-server`](../mcp-server/README.md) — the FlavorJet domain server this host connects to by default.
- [Repo root README](../../README.md) — overall architecture and tech stack.
