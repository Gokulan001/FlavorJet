/**
 * In-memory sliding-window rate limiter.
 * Tracks request timestamps per key and enforces limits within a time window.
 */

const store = new Map<string, number[]>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { allowed: boolean } {
  const now = Date.now();
  const windowStart = now - opts.windowMs;

  // Get existing timestamps, filter to current window
  const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= opts.limit) {
    store.set(key, timestamps);
    return { allowed: false };
  }

  timestamps.push(now);
  store.set(key, timestamps);
  return { allowed: true };
}
