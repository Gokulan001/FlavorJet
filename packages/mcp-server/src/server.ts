import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import * as menu from "@/lib/core/menu";
import { loginWithPassword, validateSessionId, logoutSession } from "@/lib/core/auth";
import * as cart from "@/lib/core/cart";
import * as orders from "@/lib/core/orders";
import { formatPrice } from "@/lib/utils";

export function createServer() {
  const server = new McpServer({ name: "flavorjet", version: "0.1.0" })

  // In-memory session for THIS process (stdio = one user per process).
  let session: {
    userId: number;
    username: string;
    sessionId: string;
  } | null = null;

  // Optional convenience: auto-login from an env token (used by Claude Desktop config later).
  const envToken = process.env.FLAVORJET_SESSION;
  if (envToken) {
    const v = validateSessionId(envToken);
    if (v) {
      session = {
        userId: v.userId,
        username: v.username,
        sessionId: envToken
      };
    }
  }

  // Used by the cart/order tools. Re-checks the session on EVERY call.
  function requireUserId(): number {
    if (!session) {
      throw new Error("Not logged in — call the 'login' tool first.");
    }

    const v = validateSessionId(session.sessionId);
    if (!v) {
      session = null;
      throw new Error("Session expired — log in again.");
    }

    return v.userId;
  }



  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "health check - returns pong.",
      inputSchema: { name: z.string().optional() },
    },
    async ({ name }) => (
      {
        content: [
          {
            type: "text",
            text: `pong${name ? `, ${name}` : ""}`
          }
        ],
      }
    ),
  );


  server.registerTool(
    "login",
    {
      title: "Log in",
      description: "Log in to FlavorJet with username + password to enable cart and ordering.",
      inputSchema: { username: z.string().describe("Username"), password: z.string().describe("Password") },
    },
    async ({ username, password }) => {
      const result = loginWithPassword(username, password);
      if ("error" in result) {
        return { content: [{ type: "text", text: "Invalid username or password." }], isError: true };
      }
      session = { userId: result.userId, username: result.username, sessionId: result.sessionId };
      return { content: [{ type: "text", text: `Logged in as ${result.username}.` }] };
    },
  );


  server.registerTool(
    "whoami",
    { title: "Who am I", description: "Show the currently logged-in user.", inputSchema: {} },
    async () => ({
      content: [{ type: "text", text: session ? `Logged in as ${session.username} (id ${session.userId}).` : "Not logged in." }],
    }),
  );


  server.registerTool(
    "logout",
    { title: "Log out", description: "Log out the current user — clears the session so cart/order tools require login again.", inputSchema: {} },
    async () => {
      if (!session) {
        return { content: [{ type: "text", text: "You're not logged in." }] };
      }
      const who = session.username;
      logoutSession(session.sessionId); // delete the DB session row so the token can't be reused
      session = null; // clear the in-memory session for this process
      return { content: [{ type: "text", text: `Logged out ${who}.` }] };
    },
  );



  server.registerTool(
    "find_items_by_name",
    {
      title: "Find Menu Items by Name",
      description: "Search the menu by item name or partial name. Returns matching items (name, slug, price).",
      inputSchema: { name: z.string().describe("Item name or partial name, e.g. 'pizza'") },
      outputSchema: {
        items: z.array(
          z.object({ name: z.string(), slug: z.string(), price: z.string() }),
        ),
      },
    },
    async ({ name }) => {
      const items = menu.findItemsByName(name, 6);
      const text =
        items.length === 0
          ? `No items match "${name}".`
          : items.map((i) => `• ${i.name} (${i.slug}) — ${i.price}`).join("\n");
      return { content: [{ type: "text", text }], structuredContent: { items } };
    },
  );


  server.registerTool(
    "browse_category",
    {
      title: "Browse a Category",
      description: "List items in a menu category by slug (e.g. 'pizza', 'burgers', 'salads').",
      inputSchema: { categorySlug: z.string().describe("Category slug, e.g. 'pizza'") },
      outputSchema: {
        items: z.array(
          z.object({ name: z.string(), slug: z.string(), price: z.string() }),
        ),
      },
    },
    async ({ categorySlug }) => {
      const items = menu.getCategoryItemsLocal(categorySlug);
      const text =
        items.length === 0
          ? `No items in "${categorySlug}".`
          : items.map((i) => `• ${i.name} (${i.slug}) — ${i.price}`).join("\n");
      return { content: [{ type: "text", text }], structuredContent: { items } };
    },
  );


  // Static resource
  server.registerResource(
    "menu-categories",                       // internal name
    "flavorjet://menu/categories",           // the URI clients address
    { title: "Menu Categories", description: "All FlavorJet categories.", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(menu.getCategoriesLocal(), null, 2) }],
    }),
  );


  // Dynamic resource
  server.registerResource(
    "menu-item",
    new ResourceTemplate("flavorjet://menu/item/{slug}", { list: undefined }), // {slug} is a variable
    { title: "Menu Item", description: "A single menu item by slug.", mimeType: "application/json" },
    async (uri, { slug }) => {
      const item = menu.getItemLocal(String(slug));
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(item ?? { error: `No item "${slug}"` }, null, 2),
        }],
      };
    },
  );

  server.registerPrompt(
    "meal_planner",
    {
      title: "Plan a Meal",
      description: "Plan a FlavorJet meal for a group, with an optional craving or diet.",
      argsSchema: {
        people: z.string().describe("how many people, e.g. '4'"),
        craving: z.string().optional().describe("Optional craving/diet, e.g. 'something spicy', 'vegetarian'"),
      }
    },
    ({ people, craving }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Plan a FlavorJet meal for ${people} people${craving ? ` who want ${craving}` : ""}. ` +
              `Use the browse_category and find_items_by_name tools to pick real menu items, ` +
              `suggest a balanced spread (mains, sides, a dessert or drink), and give the total price.`,
          }
        }
      ]
    })
  );


  server.registerTool(
    "add_to_cart",
    {
      title: "Add to Cart",
      description: "Add a menu item to your cart by slug. Requires login.",
      inputSchema: {
        slug: z.string().describe("Item slug, e.g. 'margherita-pizza'"),
        quantity: z.number().int().min(1).optional().describe("Quantity (default 1)"),
        modifierIds: z.array(z.number().int()).optional().describe("Modifier option ids from get_modifiers"),
      },
    },
    async ({ slug, quantity, modifierIds }) => {
      const userId = requireUserId();

      const item = menu.getLocalItemBySlug(slug);
      if (!item) {
        return { content: [{ type: "text", text: `No item "${slug}".` }], isError: true };
      }

      const result = await cart.addToCart(userId, item.id, quantity ?? 1, modifierIds ?? []);
      if ("error" in result) {
        return { content: [{ type: "text", text: `Could not add: ${result.error}` }], isError: true };
      }

      return { content: [{ type: "text", text: `Added ${quantity ?? 1} × ${item.name} to your cart.` }] };
    },
  );


  server.registerTool(
    "update_cart_quantity",
    {
      title: "Update Cart Quantity",
      description: "Change the quantity of an item already in your cart (by slug). Set 0 to remove. Requires login.",
      inputSchema: {
        slug: z.string().describe("Item slug already in your cart"),
        quantity: z.number().int().min(0).describe("New quantity (0 removes it)"),
      },
    },
    async ({ slug, quantity }) => {
      const userId = requireUserId();

      const items = await cart.getCart(userId);
      const matches = items.filter((i) => i.itemSlug === slug);

      if (matches.length === 0) {
        return { content: [{ type: "text", text: `"${slug}" isn't in your cart.` }], isError: true };
      }
      if (matches.length > 1) {
        return {
          content: [{ type: "text", text: `"${slug}" has multiple variations in your cart — remove and re-add to change one.` }],
          isError: true,
        };
      }

      await cart.updateCartQuantity(userId, matches[0].id, quantity);
      return {
        content: [{ type: "text", text: quantity === 0 ? `Removed ${slug}.` : `Set ${slug} to quantity ${quantity}.` }],
      };
    },
  );



  server.registerTool(
    "view_cart",
    {
      title: "View Cart",
      description: "Show items in your cart and the total. Requires login.",
      inputSchema: {},
      outputSchema: {
        items: z.array(
          z.object({
            cartItemId: z.number(),
            slug: z.string(),
            name: z.string(),
            quantity: z.number(),
            lineTotalCents: z.number(),
            modifiers: z.array(z.object({ id: z.number(), name: z.string() })),
          }),
        ),
        totalCents: z.number(),
      },
    },
    async () => {
      const userId = requireUserId();

      const items = await cart.getCart(userId);
      const total = items.reduce((sum, i) => sum + i.lineTotal, 0);

      const structured = {
        // cartItemId identifies a specific line for update_cart_modifiers.
        items: items.map((i) => ({
          cartItemId: i.id,
          slug: i.itemSlug,
          name: i.itemName,
          quantity: i.quantity,
          lineTotalCents: i.lineTotal,
          modifiers: i.modifiers.map((m) => ({ id: m.id, name: m.name })),
        })),
        totalCents: total,
      };

      const text =
        items.length === 0
          ? "Your cart is empty."
          : [
            ...items.map((i) => {
              const mods = i.modifiers.length ? ` (${i.modifiers.map((m) => m.name).join(", ")})` : "";
              return `• ${i.quantity} × ${i.itemName}${mods} — ${formatPrice(i.lineTotal)}`;
            }),
            `Total: ${formatPrice(total)}`,
          ].join("\n");

      return { content: [{ type: "text", text }], structuredContent: structured };
    },
  );


  server.registerTool(
    "remove_from_cart",
    {
      title: "Remove from Cart",
      description: "Remove an item from your cart by slug. Requires login.",
      inputSchema: {
        slug: z.string().describe("Item slug to remove"),
      },
    },
    async ({ slug }) => {
      const userId = requireUserId();

      const result = await cart.removeFromCartBySlug(userId, slug);
      if ("error" in result) {
        const msg =
          result.error === "item_not_in_cart" ? "That item isn't in your cart."
            : result.error === "item_not_found" ? `No item "${slug}".`
              : "Couldn't remove that item.";
        return { content: [{ type: "text", text: msg }], isError: true };
      }

      return { content: [{ type: "text", text: `Removed ${slug} from your cart.` }] };
    },
  );


  server.registerTool(
    "update_cart_modifiers",
    {
      title: "Update Item Modifiers",
      description:
        "Change the customization (size, toppings, crust, etc.) of an item already in the cart, " +
        "without removing it. Identify the line with cartItemId from view_cart, and pass the FULL " +
        "new set of modifier option ids (from get_modifiers) — this replaces the line's modifiers. " +
        "To drop an option, omit its id; to add one, include it. Requires login.",
      inputSchema: {
        cartItemId: z.number().int().describe("The cart line id from view_cart"),
        modifierIds: z
          .array(z.number().int())
          .describe("Full replacement set of modifier option ids (from get_modifiers)"),
      },
    },
    async ({ cartItemId, modifierIds }) => {
      const userId = requireUserId();

      const result = await cart.updateCartItemModifiers(userId, cartItemId, modifierIds);
      if ("error" in result) {
        const msg =
          result.error === "item_not_in_cart"
            ? "That line isn't in your cart."
            : "Couldn't update that item's modifiers.";
        return { content: [{ type: "text", text: msg }], isError: true };
      }

      return {
        content: [{ type: "text", text: `Updated modifiers for cart line ${cartItemId}.` }],
      };
    },
  );


  server.registerTool(
    "get_order_history",
    {
      title: "Order History",
      description: "List your past orders. Requires login.",
      inputSchema: {
        limit: z.number().int().min(1).optional().describe("How many recent orders (default 5)"),
      },
      outputSchema: {
        orders: z.array(
          z.object({
            id: z.number(),
            totalCents: z.number(),
            status: z.string(),
            createdAt: z.string(),
          }),
        ),
      },
    },
    async ({ limit }) => {
      const userId = requireUserId();

      const all = await orders.getOrders(userId);
      const sliced = all.slice(0, limit ?? 5);

      const structured = {
        orders: sliced.map((o) => ({
          id: o.id,
          totalCents: o.total,
          status: o.status,
          createdAt: o.createdAt,
        })),
      };

      const text =
        sliced.length === 0
          ? "No past orders."
          : sliced.map((o) => `#${o.id} — ${formatPrice(o.total)} — ${o.status} — ${o.createdAt}`).join("\n");

      return { content: [{ type: "text", text }], structuredContent: structured };
    },
  );

  server.registerTool(
    "get_modifiers",
    {
      title: "Get Modifiers",
      description:
        "Get customization options (size, toppings, etc.) for a menu item by slug. Use the returned option ids with add_to_cart.",
      inputSchema: {
        slug: z.string().describe("Item slug, e.g. 'margherita-pizza'"),
      },
      outputSchema: {
        itemName: z.string(),
        slug: z.string(),
        groups: z.array(
          z.object({
            name: z.string(),
            required: z.boolean(),
            options: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                priceAdjustmentCents: z.number(),
              }),
            ),
          }),
        ),
      },
    },
    async ({ slug }) => {
      const mods = menu.getModifiersForItem(slug);
      if (!mods) {
        return {
          content: [{ type: "text", text: `No item "${slug}".` }],
          isError: true,
        };
      }

      const structured = {
        itemName: mods.itemName,
        slug: mods.slug,
        groups: mods.groups.map((g) => ({
          name: g.name,
          required: g.required,
          options: g.options.map((o) => ({
            id: o.id,
            name: o.name,
            priceAdjustmentCents: o.priceAdjustment,
          })),
        })),
      };

      const text =
        structured.groups.length === 0
          ? `${mods.itemName} has no customization options.`
          : structured.groups
            .map(
              (g) =>
                `${g.name}${g.required ? " (required)" : ""}: ` +
                g.options
                  .map((o) => `${o.name} (id ${o.id}${o.priceAdjustmentCents ? `, +${formatPrice(o.priceAdjustmentCents)}` : ""})`)
                  .join(", "),
            )
            .join("\n");

      return {
        content: [{ type: "text", text }],
        structuredContent: structured,
      };
    },
  );


  server.registerTool(
    "place_order",
    {
      title: "Place Order",
      description:
        "Place an order for everything in your cart. Requires login. " +
        "If the client supports interactive forms, a confirmation form is shown to collect delivery details. " +
        "Otherwise, pass street/city/zip/phone (and optional tip in dollars) directly as arguments.",
      inputSchema: {
        street: z.string().optional(),
        city: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional(),
        tip: z.number().min(0).optional(),
      },
    },
    async (args) => {
      const userId = requireUserId();

      const items = await cart.getCart(userId);
      if (items.length === 0) {
        return {
          content: [{ type: "text", text: "Your cart is empty — nothing to order." }],
          isError: true,
        };
      }

      const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

      // Delivery details can arrive two ways:
      //   1. As tool arguments (works on any client - e.g. Claude Desktop today).
      //   2. Via an interactive elicitation form (clients that advertise `elicitation.form`).
      // Prefer args when present; otherwise try a form; if the client can't render one,
      // gracefully fall back to asking the model to re-call with the details as arguments.
      let street = args.street;
      let city = args.city;
      let zip = args.zip;
      let phone = args.phone;
      let tip = args.tip;

      const haveDetails = street && city && zip && phone;

      if (!haveDetails) {
        try {
          const elicit = await server.server.elicitInput({
            mode: "form",
            message: `Confirm your order — ${items.length} item(s), subtotal ${formatPrice(subtotal)}.`,
            requestedSchema: {
              type: "object",
              properties: {
                street: { type: "string", title: "Street address" },
                city: { type: "string", title: "City" },
                zip: { type: "string", title: "ZIP code" },
                phone: { type: "string", title: "Phone" },
                tip: { type: "number", title: "Tip (in dollars)", minimum: 0 },
              },
              required: ["street", "city", "zip", "phone"],
            },
          });

          if (elicit.action !== "accept" || !elicit.content) {
            return { content: [{ type: "text", text: "Order cancelled." }] };
          }

          const c = elicit.content as {
            street: string;
            city: string;
            zip: string;
            phone?: string;
            tip?: number;
          };
          street = c.street;
          city = c.city;
          zip = c.zip;
          phone = c.phone;
          tip = c.tip;
        } catch {
          // Client doesn't support form elicitation (e.g. Claude Desktop). Ask the model to
          // re-call place_order with the delivery details supplied as arguments instead.
          return {
            content: [
              {
                type: "text",
                text:
                  `Ready to order ${items.length} item(s), subtotal ${formatPrice(subtotal)}. ` +
                  "Your client can't show a confirmation form, so please provide the delivery " +
                  "details and call place_order again with these arguments: street, city, zip, " +
                  "phone (required) and tip in dollars (optional).",
              },
            ],
          };
        }
      }

      const deliveryAddress = `${street}, ${city} ${zip}`;
      const tipCents = tip ? Math.round(tip * 100) : 0;

      const result = await orders.placeOrder(userId, deliveryAddress, phone!, tipCents);

      if ("error" in result) {
        return {
          content: [{ type: "text", text: `Could not place order: ${result.error}` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Order #${result.orderId} placed! Total ${formatPrice(result.total)}, ETA ~${result.estimatedMinutes} min.`,
          },
        ],
      };
    },
  );

  server.registerTool(
    "reorder",
    {
      title: "Reorder",
      description: "Re-add all items from a past order (by order id) back into your cart. Requires login.",
      inputSchema: {
        orderId: z.number().int().describe("Order id from get_order_history, e.g. 39"),
      },
    },
    async ({ orderId }) => {
      const userId = requireUserId();

      const result = await orders.reorderFromOrder(userId, orderId);
      if ("error" in result) {
        return { content: [{ type: "text", text: `Could not reorder: ${result.error}` }], isError: true };
      }

      return {
        content: [{ type: "text", text: `Re-added order #${orderId}'s items to your cart. View it or place the order.` }],
      };
    },
  );

  server.registerTool(
    "recommend_meal",
    {
      title: "Recommend a Meal",
      description:
        "Ask the AI to suggest a meal from the FlavorJet menu based on a preference or craving. " +
        "Uses the host's LLM via MCP sampling to generate a personalised recommendation.",
      inputSchema: {
        preference: z.string().describe(
          "What the user is in the mood for, e.g. 'something spicy', 'vegetarian', 'comfort food'",
        ),
      },
    },
    async ({ preference }) => {
      const categories = await menu.getCategoriesLocal();
      const categoryList = categories.map((c) => c.name).join(", ");

      const result = await server.server.createMessage({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `The FlavorJet menu has these categories: ${categoryList}. ` +
                `Suggest one specific dish for someone who wants: "${preference}". ` +
                `Give the dish name, one sentence why it fits, and the category it's in.`,
            },
          },
        ],
        maxTokens: 200,
        systemPrompt: "You are a food critic. Be opinionated.",
      });

      const text =
        result.content.type === "text"
          ? result.content.text
          : "Could not generate a recommendation.";

      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}