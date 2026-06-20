import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import Anthropic from "@anthropic-ai/sdk";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { config } from "dotenv";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import * as readline from "node:readline/promises";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";


// Load .env.local from repo root
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../.env.local"), quiet: true });

const flavorjetEntry = resolve(here, "../../mcp-server/src/stdio.ts");
const sandboxDir = resolve(here, "../sandbox");

type ServerConfig = {
  id: string;
  command: string;
  args: string[];
};

const SERVERS: ServerConfig[] = [
  { id: "flavorjet", command: "npx", args: ["tsx", flavorjetEntry] },
  {
    id: "fs",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", sandboxDir],
  },
];

type ToolEntry = {
  serverId: string;
  client: Client;
  toolName: string;
  description: string;
  inputSchema: object;
};

const registry = new Map<string, ToolEntry>();
const clients: Client[] = [];

// Connect to every server and build the merged, namespaced registry.
for (const cfg of SERVERS) {

  const transport = new StdioClientTransport({
    command: cfg.command,
    args: cfg.args,
    stderr: "inherit",
  });

  const client = new Client(
    { name: "mcp-host", version: "0.1.0" },
    {
      capabilities: {
        elicitation: { form: {} },
        sampling: {},
      }
    },
  );

  await client.connect(transport);

  // Handle elicitation requests from any server — pause and ask the user interactively.
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    const { message, requestedSchema } = request.params;

    process.stderr.write(`\n[form] ${message}\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stderr,
    });

    const content: Record<string, unknown> = {};

    // The requestedSchema comes from the server as plain JSON Schema (not zod).
    // Cast to extract "properties" — a map of fieldName → { type, title }
    const properties = (
      requestedSchema as {
        properties?: Record<string,
          {
            type?: string;
            title?: string;
          }>;
      }
    ).properties ?? {};

    // Cast to extract "required" — array of field names that are mandatory
    const required: string[] = (
      requestedSchema as {
        required?: string[];
      }
    ).required ?? [];


    for (const [field, schema] of Object.entries(properties)) {
      const label = schema.title ?? field;
      const isRequired = required.includes(field);
      const answer = await rl.question(`  ${label}${isRequired ? "" : " (optional)"}: `);
      if (answer !== "") {
        content[field] = schema.type === "number" ? parseFloat(answer) : answer;
      }
    }

    rl.close();
    return { action: "accept", content };
  });

  // Handle sampling requests — server is asking us to call the LLM on its behalf.
  client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    const { messages, maxTokens, systemPrompt } = request.params;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens ?? 512,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === "string"
          ? m.content
          : m.content.type === "text"
            ? m.content.text
            : "",
      })),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    console.error(`[sampling result] ${text}`);

    return {
      role: "assistant",
      content: { type: "text", text },
      model: "claude-sonnet-4-6",
      stopReason: response.stop_reason ?? "end_turn",
    };
  });

  clients.push(client);

  const { tools } = await client.listTools();
  for (const t of tools) {
    registry.set(`${cfg.id}:${t.name}`, {
      serverId: cfg.id,
      client,
      toolName: t.name,
      description: t.description ?? "",
      inputSchema: (t.inputSchema ?? { type: "object", properties: {} }) as object,
    });
  }
  console.error(`Connected to ${cfg.id} (${tools.length} tools).`);
}

// Build the tools array the Claude API needs.
// Claude tool names must match ^[a-zA-Z0-9_-]{1,128}$ — colons are invalid.
// We replace "serverId:toolName" with "serverId__toolName" for Claude,
// then reverse the substitution when looking up in the registry.
const anthropicTools: Anthropic.Tool[] = Array.from(registry.entries()).map(
  ([namespacedName, entry]) => ({
    name: namespacedName.replace(":", "__"),
    description: entry.description,
    input_schema: entry.inputSchema as Anthropic.Tool["input_schema"],
  }),
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: process.env.ANTHROPIC_BASE_URL });
const messages: Anthropic.MessageParam[] = [];

// Read the user's query from the command line, e.g.: npm start "Log in as demo / demo1234 and show my cart"
const userQuery = process.argv[2] ?? "Ping the flavorjet server.";
messages.push({ role: "user", content: userQuery });
console.error(`\nQuery: ${userQuery}\n`);

// Agent loop: keep calling Claude until it stops requesting tools.
while (true) {
  // Stream the response so text prints token by token.
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: anthropicTools,
    messages,
  });

  // Print text deltas as they arrive.
  stream.on("text", (delta) => process.stdout.write(delta));

  const response = await stream.finalMessage();
  process.stdout.write("\n");

  // Append Claude's full response to history.
  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason !== "tool_use") {
    // No more tool calls — Claude is done.
    break;
  }

  // Execute every tool Claude asked for and collect results.
  const toolResults: Anthropic.ToolResultBlockParam[] = [];

  for (const block of response.content) {
    if (block.type !== "tool_use") continue;

    // Claude sends "flavorjet__ping"; registry key is "flavorjet:ping" — convert back.
    const entry = registry.get(block.name.replace("__", ":"));
    if (!entry) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: `Unknown tool: ${block.name}`,
        is_error: true,
      });
      continue;
    }

    console.error(`\n[tool] ${block.name}`);

    try {
      const result = await entry.client.callTool({
        name: entry.toolName,
        arguments: block.input as Record<string, unknown>,
      });
      const text = JSON.stringify(result);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: text,
      });
    } catch (err) {
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: String(err),
        is_error: true,
      });
    }
  }

  // Feed all results back in a single user turn.
  messages.push({ role: "user", content: toolResults });
}

for (const c of clients) await c.close();
