import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModifierPicker from "./ModifierPicker";
import type { PendingModifiers } from "./types";

function pending(overrides: Partial<PendingModifiers> = {}): PendingModifiers {
  return {
    itemId: 1,
    itemName: "Pizza",
    itemPrice: "$12.00",
    groups: [
      {
        name: "Size",
        required: true,
        options: [
          { id: 10, name: "Small", price: "Free" },
          { id: 11, name: "Large", price: "$2.00" },
        ],
      },
      {
        name: "Toppings",
        required: false,
        options: [
          { id: 20, name: "Cheese", price: "$1.00" },
          { id: 21, name: "Olives", price: "$0.50" },
        ],
      },
    ],
    currentGroupIndex: 0,
    selections: {},
    ...overrides,
  };
}

describe("ModifierPicker", () => {
  it("renders nothing when there are no groups", () => {
    const { container } = render(
      <ModifierPicker
        modifiers={pending({ groups: [] })}
        onSelect={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders item name, price, all groups with required/optional badge, and all options", () => {
    render(
      <ModifierPicker
        modifiers={pending()}
        onSelect={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Toppings")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("optional")).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
    expect(screen.getByText("Cheese")).toBeInTheDocument();
  });

  it("disables 'Add to Order' until every required group has a selection", () => {
    render(
      <ModifierPicker
        modifiers={pending()}
        onSelect={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Add to Order" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("enables 'Add to Order' when all required groups have selections", () => {
    render(
      <ModifierPicker
        modifiers={pending({ selections: { Size: [10] } })}
        onSelect={() => {}}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByRole("button", { name: "Add to Order" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });

  it("required group acts radio-like: tapping an option calls onSelect with just that id", async () => {
    const onSelect = vi.fn();
    render(
      <ModifierPicker
        modifiers={pending()}
        onSelect={onSelect}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("Large"));
    expect(onSelect).toHaveBeenCalledWith("Size", [11]);
  });

  it("optional group toggles: adds when not selected, removes when re-tapped", async () => {
    const onSelect = vi.fn();
    render(
      <ModifierPicker
        modifiers={pending({ selections: { Toppings: [20] } })}
        onSelect={onSelect}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    // Click "Cheese" (id 20) — currently selected → should remove
    await userEvent.click(screen.getByText("Cheese"));
    expect(onSelect).toHaveBeenCalledWith("Toppings", []);

    onSelect.mockClear();
    // Click "Olives" (id 21) — currently NOT selected → should append
    await userEvent.click(screen.getByText("Olives"));
    expect(onSelect).toHaveBeenCalledWith("Toppings", [20, 21]);
  });

  it("Confirm calls onConfirm when enabled", async () => {
    const onConfirm = vi.fn();
    render(
      <ModifierPicker
        modifiers={pending({ selections: { Size: [10] } })}
        onSelect={() => {}}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add to Order" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("Cancel button calls onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <ModifierPicker
        modifiers={pending()}
        onSelect={() => {}}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});
