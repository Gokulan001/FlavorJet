import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => import("@/test/mocks/next-navigation"));

const placeOrderFromAIMock = vi.fn();
const getUserAddressMock = vi.fn();

vi.mock("@/actions/cart-actions", () => ({
  placeOrderFromAI: placeOrderFromAIMock,
  getUserAddress: getUserAddressMock,
}));

const { default: CheckoutModal } = await import("./CheckoutModal");
const { routerPush } = await import("@/test/mocks/next-navigation");

beforeEach(() => {
  placeOrderFromAIMock.mockReset();
  getUserAddressMock.mockReset();
});

const sampleCart = {
  items: [
    { name: "Pizza", qty: 2, price: "$20.00", slug: "pizza" },
    { name: "Soda", qty: 1, price: "$2.50", slug: "soda" },
  ],
  total: "$22.50",
};

describe("CheckoutModal", () => {
  it("renders the cart items, subtotal, and total", async () => {
    getUserAddressMock.mockResolvedValue(null);
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());

    expect(screen.getByText("2x Pizza")).toBeInTheDocument();
    expect(screen.getByText("1x Soda")).toBeInTheDocument();
    expect(screen.getAllByText("$22.50").length).toBeGreaterThanOrEqual(2); // subtotal + total
  });

  it("renders 'No saved address' when getUserAddress returns null", async () => {
    getUserAddressMock.mockResolvedValue(null);
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());
    expect(screen.getByText("No saved address")).toBeInTheDocument();
  });

  it("renders the formatted saved address from getUserAddress", async () => {
    getUserAddressMock.mockResolvedValue({
      street: "1 Main St",
      apartment: "Apt 5",
      city: "Springfield",
      zipCode: "12345",
      phone: "555",
    });
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() =>
      expect(screen.getByText("1 Main St, Apt 5, Springfield 12345")).toBeInTheDocument(),
    );
  });

  it("Close button calls onClose", async () => {
    getUserAddressMock.mockResolvedValue(null);
    const onClose = vi.fn();
    render(<CheckoutModal cart={sampleCart} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("clicking a tip preset updates the tip display", async () => {
    getUserAddressMock.mockResolvedValue(null);
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());

    expect(screen.getByText("$0.00")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "$2" }));
    expect(screen.getByText("$2.00")).toBeInTheDocument();
  });

  it("typing a custom tip overrides preset and is shown in the summary", async () => {
    getUserAddressMock.mockResolvedValue(null);
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());

    const customInput = screen.getByPlaceholderText("Custom") as HTMLInputElement;
    await userEvent.type(customInput, "3.5");
    expect(screen.getByText("$3.50")).toBeInTheDocument();
  });

  it("on Place Order success, shows confirmation and pushes /orders/{id}", async () => {
    getUserAddressMock.mockResolvedValue(null);
    placeOrderFromAIMock.mockResolvedValue({ orderId: 42, estimatedMinutes: 30 });
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() => {
      expect(screen.getByText("Order Placed!")).toBeInTheDocument();
    });

    // The router push happens inside a setTimeout(2000) after success.
    await waitFor(
      () => {
        expect(routerPush).toContain("/orders/42");
      },
      { timeout: 3000 },
    );
  });

  it("on Place Order error, returns to the form (no success overlay)", async () => {
    getUserAddressMock.mockResolvedValue(null);
    placeOrderFromAIMock.mockResolvedValue({ error: "Cart is empty" });
    render(<CheckoutModal cart={sampleCart} onClose={() => {}} />);
    await waitFor(() => expect(getUserAddressMock).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() => {
      expect(placeOrderFromAIMock).toHaveBeenCalled();
    });
    // Form remains; success overlay never appeared.
    expect(screen.queryByText("Order Placed!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeInTheDocument();
    expect(routerPush).not.toContain("/orders/42");
  });
});
