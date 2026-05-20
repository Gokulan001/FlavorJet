import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TokenBadge from "./TokenBadge";

const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0, toolCalls: 0 };
const USAGE = {
  inputTokens: 1234,
  outputTokens: 567,
  totalTokens: 1801,
  toolCalls: 4,
};

describe("TokenBadge", () => {
  it("renders nothing when totalTokens is 0", () => {
    const { container } = render(<TokenBadge usage={ZERO_USAGE} model="test-model" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the total token count formatted with thousands separators", () => {
    render(<TokenBadge usage={USAGE} model="gemini-2.5-flash" />);
    expect(screen.getByText(/1,801 tok/)).toBeInTheDocument();
  });

  it("expands on click and shows model + input/output/tool/total breakdown", async () => {
    render(<TokenBadge usage={USAGE} model="gemini-2.5-flash" />);

    // Collapsed: model name should NOT yet be visible
    expect(screen.queryByText("gemini-2.5-flash")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));

    expect(screen.getByText("gemini-2.5-flash")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument(); // input
    expect(screen.getByText("567")).toBeInTheDocument(); // output
    expect(screen.getByText("4")).toBeInTheDocument(); // tool calls
    expect(screen.getAllByText("1,801").length).toBeGreaterThanOrEqual(1); // total in popover
  });

  it("chevron rotates (rotate-180) once expanded", async () => {
    render(<TokenBadge usage={USAGE} model="m" />);
    const btn = screen.getByRole("button");
    const chevron = btn.querySelector("svg.lucide-chevron-down")!;
    expect(chevron.className).not.toContain("rotate-180");
    await userEvent.click(btn);
    expect(chevron.className).toContain("rotate-180");
  });
});
