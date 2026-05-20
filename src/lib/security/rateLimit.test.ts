import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit } from "./rateLimit";

describe("rateLimit", () => {
  let counter = 0;
  const uniqueKey = () => `test:${process.hrtime.bigint()}:${counter++}`;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const key = uniqueKey();
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 })).toEqual({ allowed: true });
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 })).toEqual({ allowed: true });
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 })).toEqual({ allowed: true });
  });

  it("blocks the (limit + 1)-th request inside the window", () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
    }
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 })).toEqual({ allowed: false });
  });

  it("resets after the window elapses", () => {
    const key = uniqueKey();
    for (let i = 0; i < 3; i++) {
      rateLimit(key, { limit: 3, windowMs: 60_000 });
    }
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("tracks counters independently per key", () => {
    const keyA = uniqueKey();
    const keyB = uniqueKey();
    for (let i = 0; i < 3; i++) {
      rateLimit(keyA, { limit: 3, windowMs: 60_000 });
    }
    expect(rateLimit(keyA, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);
    expect(rateLimit(keyB, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });

  it("returns { allowed: boolean } on every call", () => {
    const key = uniqueKey();
    const result = rateLimit(key, { limit: 1, windowMs: 1000 });
    expect(result).toHaveProperty("allowed");
    expect(typeof result.allowed).toBe("boolean");
  });

  it("evicts old timestamps via sliding window (partial window decay)", () => {
    const key = uniqueKey();
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    vi.advanceTimersByTime(30_000);
    rateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(false);

    // Advance past the first two timestamps (>60s from t=0), leaving only one in window
    vi.advanceTimersByTime(30_001);
    expect(rateLimit(key, { limit: 3, windowMs: 60_000 }).allowed).toBe(true);
  });
});
