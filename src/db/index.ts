import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Default to <cwd>/data/flavorjet.db; allow an absolute override so processes
// launched outside the project root (e.g. the MCP server spawned by Claude
// Desktop) can still locate the database.
const dbPath = process.env.FLAVORJET_DB_PATH || path.join(process.cwd(), "data", "flavorjet.db");

// In dev mode, Next.js HMR re-evaluates modules on every change.
// Without globalThis caching, each reload creates a NEW Database() connection,
// and multiple connections to the same SQLite file cause write locks and hangs.
// This pattern ensures only ONE connection exists across all HMR reloads.

const globalForDb = globalThis as unknown as {
  _sqlite: ReturnType<typeof Database> | undefined;
};

if (!globalForDb._sqlite) {
  globalForDb._sqlite = new Database(dbPath);
  globalForDb._sqlite.pragma("journal_mode = WAL");
  globalForDb._sqlite.pragma("foreign_keys = ON");
  globalForDb._sqlite.pragma("busy_timeout = 5000");
  globalForDb._sqlite.pragma("synchronous = NORMAL");
}

export const sqlite = globalForDb._sqlite;
export const db = drizzle(sqlite, { schema });
export type DB = typeof db;
