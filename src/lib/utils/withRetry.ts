/**
 * Exponential backoff + jitter for transient errors.
 * Retries on 429, 502, 503 by default.
 */

interface RetryOptions {
  maxAttempts?: number;
  retryOn?: number[];
}

class RetryableError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "RetryableError";
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const maxAttempts = opts?.maxAttempts ?? 3;
  const retryOn = new Set(opts?.retryOn ?? [429, 502, 503]);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const status =
        error instanceof RetryableError
          ? error.status
          : (error as { status?: number })?.status ?? 0;

      const isRetryable = retryOn.has(status);
      const isLastAttempt = attempt === maxAttempts;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Exponential backoff with jitter: 2^attempt * 100ms + random 0-100ms
      const baseDelay = Math.pow(2, attempt) * 100;
      const jitter = Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
    }
  }

  throw new Error("Failed after " + maxAttempts + " attempts");
}
