import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIPageHeader from "./AIPageHeader";

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0 };

function baseProps(
  overrides: Partial<React.ComponentProps<typeof AIPageHeader>> = {},
): React.ComponentProps<typeof AIPageHeader> {
  return {
    mode: "chat",
    onModeSwitch: vi.fn(),
    language: "en",
    onLanguageChange: vi.fn(),
    voiceState: "idle",
    isLoading: false,
    isSpeaking: false,
    onClear: vi.fn(),
    tokenUsage: ZERO_USAGE,
    modelName: "test-model",
    messageCount: 0,
    ...overrides,
  };
}

describe("AIPageHeader", () => {
  it("shows 'Online' when idle", () => {
    render(<AIPageHeader {...baseProps()} />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("shows 'Thinking...' when isLoading", () => {
    render(<AIPageHeader {...baseProps({ isLoading: true })} />);
    expect(screen.getByText("Thinking...")).toBeInTheDocument();
  });

  it("shows 'Listening...' when voiceState is listening", () => {
    render(<AIPageHeader {...baseProps({ voiceState: "listening" })} />);
    expect(screen.getByText("Listening...")).toBeInTheDocument();
  });

  it("shows 'Speaking...' when isSpeaking", () => {
    render(<AIPageHeader {...baseProps({ isSpeaking: true })} />);
    expect(screen.getByText("Speaking...")).toBeInTheDocument();
  });

  it("hides the memory chip when messageCount is 0", () => {
    render(<AIPageHeader {...baseProps()} />);
    expect(screen.queryByText(/msgs$/)).not.toBeInTheDocument();
  });

  it("shows '{N} msgs' when messageCount > 0 and ≤ 8", () => {
    render(<AIPageHeader {...baseProps({ messageCount: 3 })} />);
    expect(screen.getByText("3 msgs")).toBeInTheDocument();
  });

  it("shows the compressed memory chip when messageCount > 8", () => {
    render(<AIPageHeader {...baseProps({ messageCount: 12 })} />);
    expect(screen.getByText(/8 kept/)).toBeInTheDocument();
  });

  it("mode toggle button calls onModeSwitch with the opposite mode", async () => {
    const onModeSwitch = vi.fn();
    render(<AIPageHeader {...baseProps({ mode: "chat", onModeSwitch })} />);
    await userEvent.click(screen.getByTitle("Switch to Voice"));
    expect(onModeSwitch).toHaveBeenCalledWith("voice");
  });

  it("Clear button calls onClear", async () => {
    const onClear = vi.fn();
    render(<AIPageHeader {...baseProps({ onClear })} />);
    await userEvent.click(screen.getByTitle("Clear chat"));
    expect(onClear).toHaveBeenCalled();
  });

  it("Language picker opens and selecting a language calls onLanguageChange", async () => {
    const onLanguageChange = vi.fn();
    render(<AIPageHeader {...baseProps({ onLanguageChange })} />);

    await userEvent.click(screen.getByRole("button", { name: "Select language" }));
    const spanish = await screen.findByText("Spanish");
    await userEvent.click(spanish);
    expect(onLanguageChange).toHaveBeenCalledWith("es");
  });
});
