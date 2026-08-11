import { Redis } from "@upstash/redis";

const ACTIVE_CODE_KEY = "access-gate:active-code";

export interface ActiveCode {
  code: string;
  expiresAt: number; // epoch ms
}

let redis: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

// Dev-only fallback so `npm run dev` works without Redis configured.
// Resets on server restart — never used once UPSTASH_REDIS_REST_URL/TOKEN are set.
const memoryStore = new Map<string, ActiveCode>();

export async function setActiveCode(code: string, ttlSeconds: number): Promise<ActiveCode> {
  const entry: ActiveCode = { code, expiresAt: Date.now() + ttlSeconds * 1000 };
  const client = getRedis();

  if (client) {
    await client.set(ACTIVE_CODE_KEY, entry, { ex: ttlSeconds });
  } else {
    console.warn("[access-gate] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory store (dev only).");
    memoryStore.set(ACTIVE_CODE_KEY, entry);
  }

  return entry;
}

export async function getActiveCode(): Promise<ActiveCode | null> {
  const client = getRedis();

  if (client) {
    return (await client.get<ActiveCode>(ACTIVE_CODE_KEY)) ?? null;
  }

  const entry = memoryStore.get(ACTIVE_CODE_KEY);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(ACTIVE_CODE_KEY);
    return null;
  }
  return entry;
}
