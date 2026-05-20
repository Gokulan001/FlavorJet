import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FullCartItem } from "./types";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

const updateCartQuantityMock = vi.fn();
const updateSpecialInstructionsMock = vi.fn();
const removeFromCartMock = vi.fn();

vi.mock("@/actions/cart-actions", () => ({
  updateCartQuantity: updateCartQuantityMock,
  updateSpecialInstructions: updateSpecialInstructionsMock,
  removeFromCart: removeFromCartMock,
}));

const { default: CartItemEditModal } = await import("./CartItemEditModal");

function makeItem(overrides: Partial<FullCartItem> = {}): FullCartItem {
  return {
    id: 7,
    quantity: 2,
    specialInstructions: null,
    menuItemId: 10,
    itemName: "Margherita Pizza",
    itemSlug: "margherita-pizza",
    itemPrice: 1200,
    itemImage: null,
    modifiers: [],
    unitPrice: 1200,
    lineTotal: 2400,
    ...overrides,
  };
}

beforeEach(() => {
  updateCartQuantityMock.mockReset().mockResolvedValue(undefined);
  updateSpecialInstructionsMock.mockReset().mockResolvedValue(undefined);
  removeFromCartMock.mockReset().mockResolvedValue(undefined);
});

describe("CartItemEditModal", () => {
  it("renders nothing when item is null", () => {
    const { container } = render(
      <CartItemEditModal item={null} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the item name and unit price", () => {
    render(
      <CartItemEditModal item={makeItem()} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    expect(screen.getByText("Margherita Pizza")).toBeInTheDocument();
    expect(screen.getByText("$12.00 each")).toBeInTheDocument();
  });

  it("initialises the quantity from item.quantity", () => {
    render(
      <CartItemEditModal item={makeItem({ quantity: 3 })} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("increment button increases quantity", async () => {
    render(
      <CartItemEditModal item={makeItem({ quantity: 1 })} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("decrement button decreases quantity", async () => {
    render(
      <CartItemEditModal item={makeItem({ quantity: 3 })} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("decrement does not go below 0", async () => {
    render(
      <CartItemEditModal item={makeItem({ quantity: 0 })} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Decrease quantity" }));
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("Done button is disabled when quantity is 0", () => {
    render(
      <CartItemEditModal item={makeItem({ quantity: 0 })} onClose={() => {}} onRefreshCart={() => {}} />,
    );
    expect(screen.getByRole("button", { name: /Done/i })).toBeDisabled();
  });

  it("Done calls updateCartQuantity only when quantity changed", async () => {
    const onClose = vi.fn();
    const onRefreshCart = vi.fn();
    render(
      <CartItemEditModal
        item={makeItem({ quantity: 2, specialInstructions: "no onions" })}
        onClose={onClose}
        onRefreshCart={onRefreshCart}
      />,
    );
    // increment once → qty becomes 3 (changed from 2)
    await userEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    await userEvent.click(screen.getByRole("button", { name: /Done/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateCartQuantityMock).toHaveBeenCalledWith(7, 3);
    // note unchanged → no instructions update
    expect(updateSpecialInstructionsMock).not.toHaveBeenCalled();
    expect(onRefreshCart).toHaveBeenCalled();
  });

  it("Done calls updateSpecialInstructions only when note changed", async () => {
    const onClose = vi.fn();
    render(
      <CartItemEditModal
        item={makeItem({ quantity: 2, specialInstructions: "" })}
        onClose={onClose}
        onRefreshCart={() => {}}
      />,
    );
    const textarea = screen.getByPlaceholderText(/extra napkins/i);
    await userEvent.type(textarea, "extra spicy");

    await userEvent.click(screen.getByRole("button", { name: /Done/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateSpecialInstructionsMock).toHaveBeenCalledWith(7, "extra spicy");
    // quantity unchanged → no qty update
    expect(updateCartQuantityMock).not.toHaveBeenCalled();
  });

  it("Done skips both actions when nothing changed", async () => {
    const onClose = vi.fn();
    const onRefreshCart = vi.fn();
    render(
      <CartItemEditModal
        item={makeItem({ quantity: 2, specialInstructions: "no onions" })}
        onClose={onClose}
        onRefreshCart={onRefreshCart}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Done/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateCartQuantityMock).not.toHaveBeenCalled();
    expect(updateSpecialInstructionsMock).not.toHaveBeenCalled();
    expect(onRefreshCart).toHaveBeenCalled();
  });

  it("renders modifier pills for items with modifiers", () => {
    render(
      <CartItemEditModal
        item={makeItem({
          modifiers: [
            { id: 1, name: "Extra Cheese", priceAdjustment: 150, groupName: "Toppings" },
            { id: 2, name: "Olives", priceAdjustment: 0, groupName: "Toppings" },
          ],
        })}
        onClose={() => {}}
        onRefreshCart={() => {}}
      />,
    );
    expect(screen.getByText("Extra Cheese")).toBeInTheDocument();
    expect(screen.getByText("Olives")).toBeInTheDocument();
    // price adjustment shown as formatted price
    expect(screen.getByText("+$1.50")).toBeInTheDocument();
  });

  it("Remove calls removeFromCart then onRefreshCart and onClose", async () => {
    const onClose = vi.fn();
    const onRefreshCart = vi.fn();
    render(
      <CartItemEditModal
        item={makeItem({ id: 99 })}
        onClose={onClose}
        onRefreshCart={onRefreshCart}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Remove/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(removeFromCartMock).toHaveBeenCalledWith(99);
    expect(onRefreshCart).toHaveBeenCalled();
  });

  it("Close (X) button calls onClose", async () => {
    const onClose = vi.fn();
    render(
      <CartItemEditModal item={makeItem()} onClose={onClose} onRefreshCart={() => {}} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
