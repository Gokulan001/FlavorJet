import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FullCartItem } from "./types";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

const { default: CartSidebar } = await import("./CartSidebar");

function makeFullItem(overrides: Partial<FullCartItem> = {}): FullCartItem {
  return {
    id: 1,
    quantity: 2,
    specialInstructions: null,
    menuItemId: 10,
    itemName: "Pizza",
    itemSlug: "pizza",
    itemPrice: 1000,
    itemImage: null,
    modifiers: [],
    unitPrice: 1000,
    lineTotal: 2000,
    ...overrides,
  };
}

describe("CartSidebar", () => {
  it("shows the empty-state when fullItems is empty", () => {
    render(
      <CartSidebar
        cart={null}
        fullItems={[]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    expect(screen.getByText("Your cart is empty")).toBeInTheDocument();
    expect(screen.getByText(/Chat with AI to add items/i)).toBeInTheDocument();
  });

  it("does NOT render the Checkout button when the cart is empty", () => {
    render(
      <CartSidebar
        cart={null}
        fullItems={[]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Go to Checkout/i })).not.toBeInTheDocument();
  });

  it("renders one card per item with quantity and line total", () => {
    render(
      <CartSidebar
        cart={{ items: [], total: "$35.00" }}
        fullItems={[
          makeFullItem({ id: 1, itemName: "Pizza", quantity: 2, lineTotal: 2000 }),
          makeFullItem({ id: 2, itemName: "Burger", quantity: 1, lineTotal: 1500 }),
        ]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("Burger")).toBeInTheDocument();
    expect(screen.getByText("Qty: 2")).toBeInTheDocument();
    expect(screen.getByText("Qty: 1")).toBeInTheDocument();
    // Line totals (formatted from cents): 2000 → $20.00, 1500 → $15.00
    expect(screen.getAllByText("$20.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("$15.00").length).toBeGreaterThanOrEqual(1);
  });

  it("renders modifier pills when an item has modifiers", () => {
    render(
      <CartSidebar
        cart={{ items: [], total: "$20.00" }}
        fullItems={[
          makeFullItem({
            modifiers: [
              { id: 1, name: "Cheese", priceAdjustment: 200, groupName: "Toppings" },
              { id: 2, name: "Olives", priceAdjustment: 100, groupName: "Toppings" },
            ],
          }),
        ]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    expect(screen.getByText("Cheese")).toBeInTheDocument();
    expect(screen.getByText("Olives")).toBeInTheDocument();
  });

  it("calls onEditItem when an item card is clicked", async () => {
    const onEditItem = vi.fn();
    const item = makeFullItem({ id: 42 });
    render(
      <CartSidebar
        cart={{ items: [], total: "$20.00" }}
        fullItems={[item]}
        onCheckout={() => {}}
        onEditItem={onEditItem}
      />,
    );
    await userEvent.click(screen.getByText("Pizza"));
    expect(onEditItem).toHaveBeenCalled();
    expect(onEditItem.mock.calls[0][0].id).toBe(42);
  });

  it("calls onCheckout when the desktop Checkout button is clicked", async () => {
    const onCheckout = vi.fn();
    render(
      <CartSidebar
        cart={{ items: [], total: "$20.00" }}
        fullItems={[makeFullItem()]}
        onCheckout={onCheckout}
        onEditItem={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Go to Checkout/i }));
    expect(onCheckout).toHaveBeenCalled();
  });

  it("shows the total from cart.total in the desktop footer", () => {
    render(
      <CartSidebar
        cart={{ items: [], total: "$42.50" }}
        fullItems={[makeFullItem()]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    // Desktop footer renders the total as a standalone span; mobile sticky bar
    // interleaves it with item-count text in a single span, so it's not separately matched.
    expect(screen.getByText("$42.50")).toBeInTheDocument();
  });

  it("uses '$0.00' as the fallback total when cart is null but items exist", () => {
    render(
      <CartSidebar
        cart={null}
        fullItems={[makeFullItem()]}
        onCheckout={() => {}}
        onEditItem={() => {}}
      />,
    );
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });
});
