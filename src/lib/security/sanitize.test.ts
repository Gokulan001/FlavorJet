import { describe, it, expect } from "vitest";
import { sanitize } from "./sanitize";

describe("sanitize", () => {
  it("passes plain text through unchanged (modulo trim)", () => {
    expect(sanitize("Hello, I want a pizza")).toBe("Hello, I want a pizza");
  });

  it("trims leading and trailing whitespace", () => {
    expect(sanitize("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(sanitize("")).toBe("");
  });

  it("strips <script>...</script> blocks", () => {
    expect(sanitize("<script>alert('xss')</script>Order a pizza")).toBe("Order a pizza");
  });

  it("strips <script> with attributes", () => {
    expect(sanitize('<script type="text/javascript">evil()</script>hi')).toBe("hi");
  });

  it("strips uppercase <SCRIPT> tags (case-insensitive)", () => {
    expect(sanitize("<SCRIPT>alert(1)</SCRIPT>hello")).toBe("hello");
  });

  it("strips mixed-case <Script> tags", () => {
    expect(sanitize("<Script>alert(1)</Script>hello")).toBe("hello");
  });

  it("strips inline HTML tags, preserving text content", () => {
    expect(sanitize("<b>bold</b> text")).toBe("bold text");
  });

  it("strips tags with attributes", () => {
    expect(sanitize('<img src="x" onerror="evil()">caption')).toBe("caption");
  });

  it("strips anchor tags, preserving link text", () => {
    expect(sanitize('<a href="javascript:void(0)">click me</a>')).toBe("click me");
  });

  it("strips nested tags", () => {
    expect(sanitize("<div><span>text</span></div>")).toBe("text");
  });

  it("handles multiline script injection", () => {
    const input = "<script>\nfunction evil() {\n  doSomethingBad();\n}\n</script>ask me something";
    expect(sanitize(input)).toBe("ask me something");
  });

  it("does not alter numbers and punctuation", () => {
    expect(sanitize("Order 2x Pizza @ $10.99!")).toBe("Order 2x Pizza @ $10.99!");
  });

  it("strips self-closing tags", () => {
    expect(sanitize("line1<br/>line2")).toBe("line1line2");
  });

  it("strips unclosed tags", () => {
    expect(sanitize("text<div")).toBe("text");
  });
});
