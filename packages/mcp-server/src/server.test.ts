// Automated test: connect a Client to the server over an in-memory pipe and
// exercise the full V1 surface (tools, resources, prompts, auth gate, elicitation).
import "./env.js"; // load .env.local + FLAVORJET_DB_PATH before importing the server
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createServer } from "./server.js";

let client: Client;

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverTransport);

  client = new Client(
    { name: "test", version: "0.0.0" },
    { capabilities: { elicitation: {} } },
  );

  // Stand in for the user: auto-accept any elicitation form with canned answers.
  client.setRequestHandler(ElicitRequestSchema, async () => ({
    action: "accept",
    content: { street: "1 Test St", city: "Testville", zip: "00001", phone: "5550000000", tip: 2 },
  }));

  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
});

describe("flavorjet mcp server", () => {
  it("exposes the expected tools", async () => {
    const names = (await client.listTools()).tools.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(["ping", "login", "find_items_by_name", "add_to_cart", "place_order"]),
    );
  });

  it("ping returns pong", async () => {
    const r = await client.callTool({ name: "ping", arguments: { name: "X" } });
    expect(JSON.stringify(r)).toContain("pong");
  });

  it("find_items_by_name returns pizzas from SQLite", async () => {
    const r = await client.callTool({ name: "find_items_by_name", arguments: { name: "pizza" } });
    expect(JSON.stringify(r)).toContain("Pizza");
  });

  it("gates write tools behind login", async () => {
    const r = await client.callTool({ name: "view_cart", arguments: {} });
    expect(r.isError).toBe(true);
  });

  it("logs in, adds to cart, and places an order via elicitation", async () => {
    const login = await client.callTool({
      name: "login",
      arguments: { username: "demo", password: "demo1234" },
    });
    expect(JSON.stringify(login)).toContain("Logged in");

    await client.callTool({
      name: "add_to_cart",
      arguments: { slug: "margherita-pizza", quantity: 1 },
    });

    const order = await client.callTool({ name: "place_order", arguments: {} });
    expect(JSON.stringify(order)).toContain("placed");
  });

  it("exposes resources and prompts", async () => {
    const resources = (await client.listResources()).resources.map((r) => r.uri);
    expect(resources).toContain("flavorjet://menu/categories");

    const prompts = (await client.listPrompts()).prompts.map((p) => p.name);
    expect(prompts).toContain("meal_planner");
  });
});
