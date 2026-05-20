import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuggestionChips from "./SuggestionChips";

describe("SuggestionChips", () => {
  it("renders nothing when suggestions is empty", () => {
    const { container } = render(<SuggestionChips suggestions={[]} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one button per suggestion", () => {
    render(
      <SuggestionChips
        suggestions={["Show me pizzas", "What's popular?", "Vegan options"]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Show me pizzas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "What's popular?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vegan options" })).toBeInTheDocument();
  });

  it("calls onSelect with the chip text when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <SuggestionChips suggestions={["Show me pizzas", "Vegan options"]} onSelect={onSelect} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Vegan options" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("Vegan options");
  });
});
