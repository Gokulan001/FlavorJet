import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { getMessageText, makeUIMessage } from "./types";

function textPart(text: string): UIMessage["parts"][number] {
  return { type: "text", text } as UIMessage["parts"][number];
}

function toolPart(): UIMessage["parts"][number] {
  return { type: "tool-invocation", toolInvocationId: "t1", toolName: "search_menu", state: "call", args: {} } as unknown as UIMessage["parts"][number];
}

describe("getMessageText", () => {
  it("returns the text from a single text part", () => {
    const msg: UIMessage = { id: "1", role: "user", parts: [textPart("hello")] };
    expect(getMessageText(msg)).toBe("hello");
  });

  it("concatenates multiple text parts", () => {
    const msg: UIMessage = {
      id: "1",
      role: "assistant",
      parts: [textPart("Hello "), textPart("world")],
    };
    expect(getMessageText(msg)).toBe("Hello world");
  });

  it("filters out non-text parts (tool-invocation etc.)", () => {
    const msg: UIMessage = {
      id: "1",
      role: "assistant",
      parts: [textPart("text only"), toolPart()],
    };
    expect(getMessageText(msg)).toBe("text only");
  });

  it("returns empty string when there are no parts", () => {
    const msg: UIMessage = { id: "1", role: "assistant", parts: [] };
    expect(getMessageText(msg)).toBe("");
  });

  it("returns empty string when there are only non-text parts", () => {
    const msg: UIMessage = { id: "1", role: "assistant", parts: [toolPart()] };
    expect(getMessageText(msg)).toBe("");
  });
});

describe("makeUIMessage", () => {
  it("creates a message with the given role and text", () => {
    const msg = makeUIMessage("user", "hi");
    expect(msg.role).toBe("user");
    expect(msg.parts).toHaveLength(1);
    expect((msg.parts[0] as { type: string; text: string }).text).toBe("hi");
  });

  it("uses the provided id when given", () => {
    const msg = makeUIMessage("assistant", "hello", "custom-id");
    expect(msg.id).toBe("custom-id");
  });

  it("generates an id when none is provided", () => {
    const msg = makeUIMessage("user", "test");
    expect(msg.id).toBeTruthy();
    expect(typeof msg.id).toBe("string");
  });

  it("generates unique ids for different calls", () => {
    const a = makeUIMessage("user", "a");
    const b = makeUIMessage("user", "b");
    expect(a.id).not.toBe(b.id);
  });

  it("creates a text part with type='text'", () => {
    const msg = makeUIMessage("assistant", "response");
    expect(msg.parts[0].type).toBe("text");
  });
});
