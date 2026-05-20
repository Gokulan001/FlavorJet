import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./hash";

describe("hashPassword", () => {
  it("returns hash:salt format with two hex segments", () => {
    const stored = hashPassword("hunter2");
    const parts = stored.split(":");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
  });

  it("produces a 64-byte hash (128 hex chars)", () => {
    const [hash] = hashPassword("hunter2").split(":");
    expect(hash).toHaveLength(128);
  });

  it("produces a 16-byte salt (32 hex chars)", () => {
    const [, salt] = hashPassword("hunter2").split(":");
    expect(salt).toHaveLength(32);
  });

  it("uses a different random salt on each call (same password → different output)", () => {
    const a = hashPassword("hunter2");
    const b = hashPassword("hunter2");
    expect(a).not.toBe(b);
    expect(a.split(":")[1]).not.toBe(b.split(":")[1]);
  });
});

describe("verifyPassword", () => {
  it("returns true for the correct password", () => {
    const stored = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword(stored, "correct-horse-battery-staple")).toBe(true);
  });

  it("returns false for an incorrect password", () => {
    const stored = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword(stored, "Tr0ub4dor&3")).toBe(false);
  });

  it("returns false for an empty supplied password", () => {
    const stored = hashPassword("anything");
    expect(verifyPassword(stored, "")).toBe(false);
  });

  it("is case-sensitive", () => {
    const stored = hashPassword("Password123");
    expect(verifyPassword(stored, "password123")).toBe(false);
    expect(verifyPassword(stored, "Password123")).toBe(true);
  });
});
