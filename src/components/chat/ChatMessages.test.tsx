import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

// Stub MessageBubble so we focus on ChatMessages' branching logic
vi.mock("./MessageBubble", () => ({
  default: ({ message }: { message: { id: string; role: string; parts: { type: string; text?: string }[] } }) => (
    <div data-testid={`bubble-${message.id}`} data-role={message.role}>
      {message.parts.find((p) => p.type === "text")?.text ?? ""}
    </div>
  ),
}));

const { default: ChatMessages } = await import("./ChatMessages");

function makeMsg(id: string, role: "user" | "assistant", text: string) {
  return { id, role, parts: [{ type: "text", text }] } as Parameters<typeof ChatMessages>[0]["messages"][number];
}

describe("ChatMessages", () => {
  it("renders one bubble per message", () => {
    render(
      <ChatMessages
        messages={[makeMsg("1", "user", "hi"), makeMsg("2", "assistant", "hello")]}
        isLoading={false}
        suggestions={[]}
        onSuggestionSelect={() => {}}
      />,
    );
    expect(screen.getByTestId("bubble-1")).toBeInTheDocument();
    expect(screen.getByTestId("bubble-2")).toBeInTheDocument();
  });

  it("shows the loading indicator (role='status', AI is typing) when isLoading", () => {
    render(
      <ChatMessages
        messages={[]}
        isLoading={true}
        suggestions={[]}
        onSuggestionSelect={() => {}}
      />,
    );
    expect(screen.getByRole("status", { name: "AI is typing" })).toBeInTheDocument();
  });

  it("does NOT render suggestion chips while loading", () => {
    render(
      <ChatMessages
        messages={[]}
        isLoading={true}
        suggestions={["Show me pizzas"]}
        onSuggestionSelect={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: "Show me pizzas" })).not.toBeInTheDocument();
  });

  it("renders suggestion chips when not loading and suggestions are present", () => {
    render(
      <ChatMessages
        messages={[]}
        isLoading={false}
        suggestions={["Show me pizzas", "Vegan options"]}
        onSuggestionSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Show me pizzas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vegan options" })).toBeInTheDocument();
  });
});
