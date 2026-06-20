import "./env.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server";


const server = createServer();
await server.connect(new StdioServerTransport());
// DO NOT console.log here — stdout is the JSON-RPC channel. Use console.error for logs.


