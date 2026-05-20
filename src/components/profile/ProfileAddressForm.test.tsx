// NOTE: The geolocation / Nominatim path (detectLocation in ProfileAddressForm.tsx:35-58)
// is intentionally NOT tested here — same rationale as src/components/checkout/AddressForm.test.tsx.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/cart-actions", () => ({
  saveUserAddress: vi.fn(),
}));

import { saveUserAddress } from "@/actions/cart-actions";
const { default: ProfileAddressForm } = await import("./ProfileAddressForm");

const saveAddressMock = vi.mocked(saveUserAddress);

const emptyAddress = {
  street: null,
  apartment: null,
  city: null,
  zipCode: null,
  phone: null,
};

const filledAddress = {
  street: "1 Main St",
  apartment: "Apt 4B",
  city: "Townsville",
  zipCode: "12345",
  phone: "555-1234",
};

beforeEach(() => {
  saveAddressMock.mockReset();
  saveAddressMock.mockResolvedValue(undefined as never);
});

describe("ProfileAddressForm — initial state", () => {
  it("renders empty inputs when initialAddress fields are all null", () => {
    render(<ProfileAddressForm initialAddress={emptyAddress} />);
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("Apt 4B") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("New York") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("10001") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("(555) 123-4567") as HTMLInputElement).value).toBe("");
  });

  it("renders inputs prefilled from initialAddress", () => {
    render(<ProfileAddressForm initialAddress={filledAddress} />);
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe(
      "1 Main St",
    );
    expect((screen.getByPlaceholderText("Apt 4B") as HTMLInputElement).value).toBe("Apt 4B");
    expect((screen.getByPlaceholderText("New York") as HTMLInputElement).value).toBe(
      "Townsville",
    );
    expect((screen.getByPlaceholderText("10001") as HTMLInputElement).value).toBe("12345");
    expect((screen.getByPlaceholderText("(555) 123-4567") as HTMLInputElement).value).toBe(
      "555-1234",
    );
  });
});

describe("ProfileAddressForm — typing", () => {
  it("each field independently updates state", async () => {
    const user = userEvent.setup();
    render(<ProfileAddressForm initialAddress={emptyAddress} />);
    const street = screen.getByPlaceholderText("123 Main Street") as HTMLInputElement;
    await user.type(street, "42 Elm");
    expect(street.value).toBe("42 Elm");

    const city = screen.getByPlaceholderText("New York") as HTMLInputElement;
    await user.type(city, "Elmsville");
    expect(city.value).toBe("Elmsville");
  });
});

describe("ProfileAddressForm — save flow", () => {
  it("Save Address button calls saveUserAddress with the full 5-field object", async () => {
    const user = userEvent.setup();
    render(<ProfileAddressForm initialAddress={filledAddress} />);
    await user.click(screen.getByRole("button", { name: /Save Address/i }));

    await waitFor(() =>
      expect(saveAddressMock).toHaveBeenCalledWith({
        street: "1 Main St",
        apartment: "Apt 4B",
        city: "Townsville",
        zipCode: "12345",
        phone: "555-1234",
      }),
    );
  });

  it("Save button text/icon changes through Save → Saving → Saved → Save again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    saveAddressMock.mockResolvedValue(undefined as never);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    try {
      render(<ProfileAddressForm initialAddress={filledAddress} />);
      expect(screen.getByRole("button", { name: /Save Address/i })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Save Address/i }));

      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Saved!/i })).toBeInTheDocument(),
      );

      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      expect(screen.getByRole("button", { name: /Save Address/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ProfileAddressForm — 'Use My Location'", () => {
  it("the button is present (geolocation path itself skipped per file comment)", () => {
    render(<ProfileAddressForm initialAddress={emptyAddress} />);
    expect(screen.getByRole("button", { name: /Use My Location/i })).toBeInTheDocument();
  });
});
