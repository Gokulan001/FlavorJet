// NOTE: The geolocation / Nominatim path (detectLocation in AddressForm.tsx:30-69) is
// intentionally NOT tested here. It depends on navigator.geolocation + an external
// reverse-geocoding API, both of which would be replaced by mocks under test, making
// the assertions test our own mocks rather than real behavior. The manual field-entry
// path is fully covered below.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressForm from "./AddressForm";

let lastAddress: {
  street: string;
  apartment: string;
  city: string;
  zipCode: string;
  phone: string;
} | null = null;

const onAddressChange = (a: typeof lastAddress) => {
  lastAddress = a;
};

beforeEach(() => {
  lastAddress = null;
});

describe("AddressForm — manual entry", () => {
  it("renders empty inputs when initialAddress is null", () => {
    render(<AddressForm initialAddress={null} onAddressChange={onAddressChange} />);
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("Apt 4B") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("New York") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("10001") as HTMLInputElement).value).toBe("");
    expect((screen.getByPlaceholderText("(555) 123-4567") as HTMLInputElement).value).toBe("");
  });

  it("renders inputs prefilled from initialAddress", () => {
    render(
      <AddressForm
        initialAddress={{
          street: "1 Main St",
          apartment: "Apt 4B",
          city: "Townsville",
          zipCode: "12345",
          phone: "555-1234",
        }}
        onAddressChange={onAddressChange}
      />,
    );
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

  it("treats null fields from initialAddress as empty strings", () => {
    render(
      <AddressForm
        initialAddress={{
          street: null,
          apartment: null,
          city: null,
          zipCode: null,
          phone: null,
        }}
        onAddressChange={onAddressChange}
      />,
    );
    expect((screen.getByPlaceholderText("123 Main Street") as HTMLInputElement).value).toBe("");
  });

  it("typing into a field fires onAddressChange with the updated object", async () => {
    const user = userEvent.setup();
    render(<AddressForm initialAddress={null} onAddressChange={onAddressChange} />);
    const street = screen.getByPlaceholderText("123 Main Street") as HTMLInputElement;
    await user.type(street, "42 Elm");
    await waitFor(() => {
      expect(lastAddress?.street).toBe("42 Elm");
    });
  });

  it("each of the 5 fields independently updates the address payload", async () => {
    const user = userEvent.setup();
    render(<AddressForm initialAddress={null} onAddressChange={onAddressChange} />);
    await user.type(screen.getByPlaceholderText("123 Main Street"), "1 St");
    await user.type(screen.getByPlaceholderText("Apt 4B"), "2B");
    await user.type(screen.getByPlaceholderText("New York"), "City");
    await user.type(screen.getByPlaceholderText("10001"), "12345");
    await user.type(screen.getByPlaceholderText("(555) 123-4567"), "555");

    await waitFor(() => {
      expect(lastAddress).toEqual({
        street: "1 St",
        apartment: "2B",
        city: "City",
        zipCode: "12345",
        phone: "555",
      });
    });
  });

  it("'Use My Location' button is present (geolocation path itself skipped per file comment)", () => {
    render(<AddressForm initialAddress={null} onAddressChange={onAddressChange} />);
    expect(screen.getByRole("button", { name: /Use My Location/i })).toBeInTheDocument();
  });
});
