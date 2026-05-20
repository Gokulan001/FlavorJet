import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withRetry } from "./withRetry";

function retryableError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

describe("withRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0); // eliminate jitter for deterministic delays
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns the value immediately when fn succeeds on first attempt", async () => {
    const fn = vi.fn().mockResolvedValue("result");
    const promise = withRetry(fn);
    const result = await promise;
    expect(result).toBe("result");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 and succeeds on second attempt", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError(429))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 502", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError(502))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retries on 503", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError(503))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately for non-retryable errors (e.g. 404)", async () => {
    const err = retryableError(404);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn)).rejects.toThrow("HTTP 404");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws immediately for errors with no status property", async () => {
    const err = new Error("network failure");
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn)).rejects.toThrow("network failure");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("exhausts maxAttempts (default 3) and rethrows the last error", async () => {
    const err = retryableError(429);
    const fn = vi.fn().mockRejectedValue(err);

    const promise = withRetry(fn);
    // Attach rejection handler BEFORE advancing timers so the rejection
    // is never "unhandled" from Vitest's perspective.
    const caught = promise.catch((e: Error) => e.message);

    await vi.advanceTimersByTimeAsync(10000);

    const message = await caught;
    expect(message).toBe("HTTP 429");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects custom maxAttempts=1 (no retry at all)", async () => {
    const err = retryableError(429);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { maxAttempts: 1 })).rejects.toThrow("HTTP 429");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects custom maxAttempts=5", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError(429))
      .mockRejectedValueOnce(retryableError(429))
      .mockRejectedValueOnce(retryableError(429))
      .mockRejectedValueOnce(retryableError(429))
      .mockResolvedValueOnce("finally");

    const promise = withRetry(fn, { maxAttempts: 5 });
    await vi.advanceTimersByTimeAsync(30000);
    const result = await promise;

    expect(result).toBe("finally");
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("respects custom retryOn: retries on 500 when specified", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(retryableError(500))
      .mockResolvedValueOnce("ok");

    const promise = withRetry(fn, { retryOn: [500] });
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects custom retryOn: does NOT retry on 429 when not in custom list", async () => {
    const err = retryableError(429);
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { retryOn: [500] })).rejects.toThrow("HTTP 429");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
