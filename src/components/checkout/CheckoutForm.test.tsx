import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let lastPlaceOrderProps: Record<string, unknown> | null = null;

vi.mock("@/components/cart/PlaceOrderButton", () => ({
  default: (props: Record<string, unknown>) => {
    lastPlaceOrderProps = props;
    return <button data-testid="place-order-stub">Place Order</button>;
  },
}));

const { default: CheckoutForm } = await import("./CheckoutForm");

beforeEach(() => {
  lastPlaceOrderProps = null;
});

describe("CheckoutForm", () => {
  it("hides the 'Save my address' checkbox when address.street is empty", () => {
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);
    expect(
      screen.queryByText(/Save this address for next time/i),
    ).not.toBeInTheDocument();
  });

  it("shows the 'Save my address' checkbox once a street is filled", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);
    await user.type(screen.getByPlaceholderText("123 Main Street"), "1 Main St");
    expect(
      screen.getByText(/Save this address for next time/i),
    ).toBeInTheDocument();
  });

  it("renders subtotal, no tip line (when tip=0), and total = subtotal", () => {
    render(<CheckoutForm subtotal={2500} initialAddress={null} />);
    // Both the subtotal line AND the total line render $25.00 when tip=0
    expect(screen.getAllByText("$25.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("Tip")).not.toBeInTheDocument();
  });

  it("adds the tip line and bumps the total when a tip is entered", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);

    await user.click(screen.getByRole("button", { name: "10%" }));
    // Subtotal $20, tip $2 → total $22
    // Tip + Total render via formatPrice (subtotal/100 * percent /100 toFixed)
    expect(screen.getByText("$22.00")).toBeInTheDocument();
  });

  it("passes fullAddress (comma-joined non-empty parts) to PlaceOrderButton", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);
    await user.type(screen.getByPlaceholderText("123 Main Street"), "1 Main St");
    await user.type(screen.getByPlaceholderText("Apt 4B"), "Apt 4B");
    await user.type(screen.getByPlaceholderText("New York"), "Townsville");
    await user.type(screen.getByPlaceholderText("10001"), "12345");

    expect(lastPlaceOrderProps?.deliveryAddress).toBe(
      "1 Main St, Apt 4B, Townsville, 12345",
    );
  });

  it("default saveAddress=true is wired to PlaceOrderButton", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);
    await user.type(screen.getByPlaceholderText("123 Main Street"), "1 Main St");
    expect(lastPlaceOrderProps?.saveAddress).toBe(true);
  });

  it("unchecking the 'Save my address' checkbox flips saveAddress to false", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm subtotal={2000} initialAddress={null} />);
    await user.type(screen.getByPlaceholderText("123 Main Street"), "1 Main St");
    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);
    expect(lastPlaceOrderProps?.saveAddress).toBe(false);
  });
});
