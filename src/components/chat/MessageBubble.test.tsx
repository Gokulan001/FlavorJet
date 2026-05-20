import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("./MenuImagesContext", () => ({
  useMenuImages: () => new Map(),
  MenuImagesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: MessageBubble } = await import("./MessageBubble");

function userMsg(text: string, id = "u1", parts: { type: string; [k: string]: unknown }[] = []): UIMessage {
  return {
    id,
    role: "user",
    parts: [{ type: "text", text }, ...parts] as UIMessage["parts"],
  };
}

function assistantMsg(text: string, parts: { type: string; [k: string]: unknown }[] = []): UIMessage {
  return {
    id: "a1",
    role: "assistant",
    parts: [{ type: "text", text }, ...parts] as UIMessage["parts"],
  };
}

describe("MessageBubble", () => {
  it("renders plain user text", () => {
    render(<MessageBubble message={userMsg("hello there")} index={0} />);
    expect(screen.getByText("hello there")).toBeInTheDocument();
  });

  it("renders nothing when message has no text, no images, no menu items", () => {
    const empty: UIMessage = { id: "x", role: "assistant", parts: [] };
    const { container } = render(<MessageBubble message={empty} index={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the bot avatar (next/image src) for assistant messages", () => {
    render(<MessageBubble message={assistantMsg("hi")} index={0} />);
    const img = screen.getByAltText("FlavorJet AI") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain("/ai-avatar.png");
  });

  it("renders the user's profile picture when provided", () => {
    render(
      <MessageBubble
        message={userMsg("hey")}
        index={0}
        userProfilePicture="/img/me.jpg"
      />,
    );
    const img = screen.getByAltText("You") as HTMLImageElement;
    expect(img.src).toContain("/img/me.jpg");
  });

  it("falls back to the User icon when userProfilePicture is null", () => {
    render(<MessageBubble message={userMsg("hey")} index={0} userProfilePicture={null} />);
    expect(screen.queryByAltText("You")).not.toBeInTheDocument();
    expect(screen.getByTestId("user-icon-fallback")).toBeInTheDocument();
  });

  it("renders the streaming cursor when the last text part is in 'streaming' state", () => {
    const message: UIMessage = {
      id: "a-stream",
      role: "assistant",
      parts: [
        { type: "text", text: "thinking", state: "streaming" } as unknown as UIMessage["parts"][number],
      ],
    };
    render(<MessageBubble message={message} index={0} />);
    expect(screen.getByTestId("streaming-cursor")).toBeInTheDocument();
  });

  it("does NOT render the streaming cursor for a completed text part", () => {
    render(<MessageBubble message={assistantMsg("done")} index={0} />);
    expect(screen.queryByTestId("streaming-cursor")).not.toBeInTheDocument();
  });

  it("renders MenuItemCard cards for assistant messages with tool-search_menu results", () => {
    const message: UIMessage = {
      id: "a2",
      role: "assistant",
      parts: [
        { type: "text", text: "Here are some options:" },
        {
          type: "tool-search_menu",
          state: "output-available",
          output: {
            items: [
              {
                slug: "margherita-pizza",
                name: "Margherita Pizza",
                price: "$12.00",
                rating: "4.5",
                hasModifiers: false,
                vegan: false,
                vegetarian: true,
                glutenFree: false,
              },
            ],
          },
        } as unknown as UIMessage["parts"][number],
      ],
    };
    render(<MessageBubble message={message} index={0} />);
    expect(screen.getByText("Margherita Pizza")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
  });

  it("excludes items already added to cart from the card carousel", () => {
    const message: UIMessage = {
      id: "a3",
      role: "assistant",
      parts: [
        { type: "text", text: "OK" },
        {
          type: "tool-add_to_cart",
          state: "output-available",
          output: { addedSlugs: ["pizza-1"] },
        } as unknown as UIMessage["parts"][number],
        {
          type: "tool-search_menu",
          state: "output-available",
          output: {
            items: [
              {
                slug: "pizza-1",
                name: "Pizza One",
                price: "$10",
                rating: "4",
                hasModifiers: false,
                vegan: false,
                vegetarian: false,
                glutenFree: false,
              },
              {
                slug: "pizza-2",
                name: "Pizza Two",
                price: "$11",
                rating: "4",
                hasModifiers: false,
                vegan: false,
                vegetarian: false,
                glutenFree: false,
              },
            ],
          },
        } as unknown as UIMessage["parts"][number],
      ],
    };
    render(<MessageBubble message={message} index={0} />);
    // Pizza One (already added) should NOT appear as a card
    expect(screen.queryByText("Pizza One")).not.toBeInTheDocument();
    expect(screen.getByText("Pizza Two")).toBeInTheDocument();
  });

  it("renders uploaded images from a user 'file' part", () => {
    const message = userMsg("see this", "u2", [
      { type: "file", mediaType: "image/png", url: "data:image/png;base64,xxx" },
    ]);
    render(<MessageBubble message={message} index={0} />);
    expect(screen.getByAltText("Uploaded")).toBeInTheDocument();
  });

  it("renders bullet items, numbered items, bold and links via FormatText", () => {
    const text = "**Hi** — here is the link https://example.com and:\n- one\n- two\n1. first\n2. second";
    render(<MessageBubble message={assistantMsg(text)} index={0} />);
    expect(screen.getByText("Hi")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(screen.getByText("second")).toBeInTheDocument();
    const link = screen.getByRole("link") as HTMLAnchorElement;
    expect(link.href).toContain("example.com");
  });
});
