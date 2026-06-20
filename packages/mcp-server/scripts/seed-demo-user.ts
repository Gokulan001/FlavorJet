// One-time setup: ensure a known demo account exists for MCP login.
// Run: npx tsx scripts/seed-demo-user.ts
import "../src/env.js"; // loads FLAVORJET_DB_PATH so we hit the real SQLite
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/hash";

const USERNAME = "demo";
const PASSWORD = "demo1234";

const existing = db.select({ id: users.id }).from(users).where(eq(users.username, USERNAME)).get();
if (existing) {
  console.log(`demo user already exists (id ${existing.id}). login: ${USERNAME} / ${PASSWORD}`);
} else {
  const row = db
    .insert(users)
    .values({ username: USERNAME, email: "demo@flavorjet.local", password: hashPassword(PASSWORD) })
    .returning({ id: users.id })
    .get();
  console.log(`created demo user id ${row.id}. login: ${USERNAME} / ${PASSWORD}`);
}
