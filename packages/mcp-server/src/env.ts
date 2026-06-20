import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url)); // packages/mcp-server/src
const repoRoot = resolve(here, "../../..");           // repo root

config({ path: resolve(repoRoot, ".env.local"), quiet: true });      // quiet: no banner on stdout (it corrupts stdio JSON-RPC)
process.env.FLAVORJET_DB_PATH ||= resolve(repoRoot, "data/flavorjet.db"); // cwd-independent DB path
