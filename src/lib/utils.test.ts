import { describe, it, expect } from "vitest";
import { formatPrice, slugify, cn } from "./utils";

describe("formatPrice", () => {
  it("formats zero cents as $0.00", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats 100 cents as $1.00", () => {
    expect(formatPrice(100)).toBe("$1.00");
  });

  it("formats 1050 cents as $10.50", () => {
    expect(formatPrice(1050)).toBe("$10.50");
  });

  it("formats 1099 cents as $10.99", () => {
    expect(formatPrice(1099)).toBe("$10.99");
  });

  it("formats large value correctly", () => {
    expect(formatPrice(100000)).toBe("$1000.00");
  });

  it("formats negative cents (refund/discount)", () => {
    expect(formatPrice(-50)).toBe("$-0.50");
  });
});

describe("slugify", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("  Hello  ")).toBe("hello");
  });

  it("collapses consecutive non-alphanumeric chars into a single dash", () => {
    expect(slugify("Margherita  Pizza!!!")).toBe("margherita-pizza");
  });

  it("handles special characters", () => {
    expect(slugify("Café & Bar")).toBe("caf-bar");
  });

  it("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  it("handles already-slugified strings unchanged", () => {
    expect(slugify("margherita-pizza")).toBe("margherita-pizza");
  });

  it("handles numbers", () => {
    expect(slugify("Item 42")).toBe("item-42");
  });
});

describe("cn", () => {
  it("joins multiple truthy class strings", () => {
    expect(cn("foo", "bar", "baz")).toBe("foo bar baz");
  });

  it("filters out falsy values", () => {
    expect(cn("foo", false, undefined, null, "bar")).toBe("foo bar");
  });

  it("returns empty string when all values are falsy", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("works with a single class", () => {
    expect(cn("only")).toBe("only");
  });

  it("handles conditional class pattern", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe("base active");
  });
});
