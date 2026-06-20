// Dev smoke harness — talks to the server in-process via a linked in-memory pipe.
// Run: npx tsx src/_check.ts   (add tool calls here as we build each slice)
import "./env.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "./server.js";
import { ElicitRequestSchema } from "@modelcontextprotocol/sdk/types.js";


const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

const server = createServer();
await server.connect(serverTransport);

const client = new Client({ name: "smoke", version: "0.0.0" }, { capabilities: { elicitation: {}}});
await client.connect(clientTransport);

// Simulate the user filling + accepting the form.
client.setRequestHandler(ElicitRequestSchema, async (request) => {
  console.error("ELICIT:", request.params.message);
  return {
    action: "accept",
    content: { street: "123 Test St", city: "Testville", zip: "00001", phone: "5551234567", tip: 3 },
  };
});

console.error("TOOLS:", (await client.listTools()).tools.map((t) => t.name));
console.error("ping ->", JSON.stringify(await client.callTool({ name: "ping", arguments: { name: "Gokul" } })));
console.error("find ->", JSON.stringify(await client.callTool({ name: "find_items_by_name", arguments: { name: "pizza" } })));
console.error("browse ->", JSON.stringify(await client.callTool({ name: "browse_category", arguments: { categorySlug: "pizza" }})));
console.error("modifiers ->", JSON.stringify(await client.callTool({ name: "get_modifiers", arguments: { slug: "margherita-pizza" } })));
console.error("RESOURCES:", (await client.listResources()).resources.map((r) => r.uri));
console.error("categories ->", JSON.stringify(await client.readResource({ uri: "flavorjet://menu/categories" })));
console.error("item ->", JSON.stringify(await client.readResource({ uri: "flavorjet://menu/item/margherita-pizza" })));
console.error("PROMPTS:", (await client.listPrompts()).prompts.map((p) => p.name));
console.error("meal_planner ->", JSON.stringify(await client.getPrompt({ name: "meal_planner", arguments: { people: "4", craving: "spicy" } })));
console.error("whoami(before) ->", JSON.stringify(await client.callTool({ name: "whoami", arguments: {} })));
console.error("login ->", JSON.stringify(await client.callTool({ name: "login", arguments: { username: "demo", password: "demo1234" } })));
console.error("whoami(after) ->", JSON.stringify(await client.callTool({ name: "whoami", arguments: {} })));
console.error("add ->", JSON.stringify(await client.callTool({ name: "add_to_cart", arguments: { slug: "margherita-pizza", quantity: 2 } })));
console.error("view ->", JSON.stringify(await client.callTool({ name: "view_cart", arguments: {} })));
console.error("history ->", JSON.stringify(await client.callTool({ name: "get_order_history", arguments: {} })));
console.error("add ->", JSON.stringify(await client.callTool({ name: "add_to_cart", arguments: { slug: "margherita-pizza", quantity: 2 } })));
console.error("view ->", JSON.stringify(await client.callTool({ name: "view_cart", arguments: {} })));
console.error("history ->", JSON.stringify(await client.callTool({ name: "get_order_history", arguments: {} })));

console.error("place_order ->", JSON.stringify(await client.callTool({ name: "place_order", arguments: {} })));


await client.close();
