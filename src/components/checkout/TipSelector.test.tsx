import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TipSelector from "./TipSelector";

const SUBTOTAL = 2000; // $20.00 in cents

let lastTipCents: number | null = null;
const onTipChange = (v: number) => {
  lastTipCents = v;
};

beforeEach(() => {
  lastTipCents = null;
});

describe("TipSelector", () => {
  it("renders all four preset buttons", () => {
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    expect(screen.getByRole("button", { name: "No Tip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "15%" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20%" })).toBeInTheDocument();
  });

  it("clicking 10% reports Math.round(subtotal * 10 / 100) cents", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    await user.click(screen.getByRole("button", { name: "10%" }));
    expect(lastTipCents).toBe(200);
  });

  it("clicking 20% reports 400 cents on a $20 subtotal", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    await user.click(screen.getByRole("button", { name: "20%" }));
    expect(lastTipCents).toBe(400);
  });

  it("clicking No Tip reports 0", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    await user.click(screen.getByRole("button", { name: "10%" }));
    await user.click(screen.getByRole("button", { name: "No Tip" }));
    expect(lastTipCents).toBe(0);
  });

  it("selecting a preset visually highlights it", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    const tenBtn = screen.getByRole("button", { name: "10%" });
    expect(tenBtn.className).not.toMatch(/bg-\[#fea116\]/);
    await user.click(tenBtn);
    expect(tenBtn.className).toMatch(/bg-\[#fea116\]/);
  });

  it("typing a custom tip parses to cents and clears the preset", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    await user.click(screen.getByRole("button", { name: "10%" }));

    const customInput = screen.getByPlaceholderText("Custom amount");
    await user.clear(customInput);
    await user.type(customInput, "3");
    expect(lastTipCents).toBe(300); // $3.00 in cents

    // Preset deselected
    expect(screen.getByRole("button", { name: "10%" }).className).not.toMatch(
      /bg-\[#fea116\]/,
    );
  });

  it("non-numeric/negative custom input reports 0", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    const customInput = screen.getByPlaceholderText("Custom amount");
    await user.type(customInput, "-1");
    expect(lastTipCents).toBe(0);
  });

  it("shows formatted 'Tip: $X.YY' when tip > 0", async () => {
    const user = userEvent.setup();
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    await user.click(screen.getByRole("button", { name: "15%" }));
    // 15% of $20.00 = $3.00 → 300 cents
    expect(screen.getByText("Tip: $3.00")).toBeInTheDocument();
  });

  it("does NOT show the tip label when tip is 0", () => {
    render(<TipSelector subtotal={SUBTOTAL} onTipChange={onTipChange} />);
    expect(screen.queryByText(/^Tip:/)).not.toBeInTheDocument();
  });
});
