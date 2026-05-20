import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/cart-actions", () => ({
  placeOrder: vi.fn(),
  saveUserAddress: vi.fn(),
}));

import { placeOrder, saveUserAddress } from "@/actions/cart-actions";
const { default: PlaceOrderButton } = await import("./PlaceOrderButton");

const placeOrderMock = vi.mocked(placeOrder);
const saveAddressMock = vi.mocked(saveUserAddress);

const goodAddress = {
  street: "1 Main",
  apartment: "Apt 4B",
  city: "Town",
  zipCode: "12345",
  phone: "555",
};

beforeEach(() => {
  placeOrderMock.mockReset();
  saveAddressMock.mockReset();
  placeOrderMock.mockResolvedValue(undefined as never);
  saveAddressMock.mockResolvedValue(undefined as never);
});

describe("PlaceOrderButton", () => {
  it("renders a 'Place Order' button by default", () => {
    render(<PlaceOrderButton />);
    expect(screen.getByRole("button", { name: /Place Order/i })).toBeInTheDocument();
  });

  it("clicking calls placeOrder(address, phone, tip)", async () => {
    const user = userEvent.setup();
    render(
      <PlaceOrderButton
        deliveryAddress="1 Main, Town"
        deliveryPhone="555"
        tip={200}
      />,
    );
    await user.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(placeOrderMock).toHaveBeenCalledWith("1 Main, Town", "555", 200),
    );
  });

  it("calls saveUserAddress before placeOrder when saveAddress=true and street is non-empty", async () => {
    const user = userEvent.setup();
    render(
      <PlaceOrderButton
        deliveryAddress="1 Main, Town"
        deliveryPhone="555"
        tip={0}
        saveAddress
        addressData={goodAddress}
      />,
    );
    await user.click(screen.getByRole("button"));
    await waitFor(() => {
      expect(saveAddressMock).toHaveBeenCalledWith(goodAddress);
      expect(placeOrderMock).toHaveBeenCalled();
    });
    // saveAddress invoked before placeOrder
    const saveOrder = saveAddressMock.mock.invocationCallOrder[0];
    const placeOrderOrder = placeOrderMock.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(placeOrderOrder);
  });

  it("does NOT call saveUserAddress when saveAddress=false", async () => {
    const user = userEvent.setup();
    render(
      <PlaceOrderButton
        deliveryAddress="1 Main, Town"
        deliveryPhone="555"
        tip={0}
        saveAddress={false}
        addressData={goodAddress}
      />,
    );
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(placeOrderMock).toHaveBeenCalled());
    expect(saveAddressMock).not.toHaveBeenCalled();
  });

  it("does NOT call saveUserAddress when addressData.street is empty", async () => {
    const user = userEvent.setup();
    render(
      <PlaceOrderButton
        deliveryAddress=""
        deliveryPhone=""
        tip={0}
        saveAddress
        addressData={{ ...goodAddress, street: "" }}
      />,
    );
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(placeOrderMock).toHaveBeenCalled());
    expect(saveAddressMock).not.toHaveBeenCalled();
  });
});
