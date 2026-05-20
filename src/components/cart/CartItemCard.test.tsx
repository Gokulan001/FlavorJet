import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));

vi.mock("@/actions/cart-actions", () => ({
  updateCartQuantity: vi.fn(),
  removeFromCart: vi.fn(),
  updateSpecialInstructions: vi.fn(),
}));

import {
  updateCartQuantity,
  removeFromCart,
  updateSpecialInstructions,
} from "@/actions/cart-actions";
const { default: CartItemCard } = await import("./CartItemCard");

const updateQtyMock = vi.mocked(updateCartQuantity);
const removeMock = vi.mocked(removeFromCart);
const updateInstrMock = vi.mocked(updateSpecialInstructions);

const baseItem = {
  id: 42,
  quantity: 2,
  specialInstructions: null,
  menuItemId: 100,
  itemName: "Pepperoni Pizza",
  itemSlug: "pepperoni-pizza",
  itemPrice: 1000,
  itemImage: "/img/pepperoni.jpg",
  categoryId: 1,
  categorySlug: "pizza",
  modifiers: [],
  unitPrice: 1000,
  lineTotal: 2000,
};

beforeEach(() => {
  updateQtyMock.mockReset();
  removeMock.mockReset();
  updateInstrMock.mockReset();
  updateQtyMock.mockResolvedValue(undefined);
  removeMock.mockResolvedValue(undefined);
  updateInstrMock.mockResolvedValue(undefined);
});

describe("CartItemCard", () => {
  it("renders item name, image alt, modifiers (when present), and line total", () => {
    render(
      <CartItemCard
        item={{
          ...baseItem,
          modifiers: [
            { id: 11, name: "Large", priceAdjustment: 200, groupName: "Size" },
            { id: 12, name: "Extra Cheese", priceAdjustment: 100, groupName: "Toppings" },
          ],
          unitPrice: 1300,
          lineTotal: 2600,
        }}
      />,
    );
    expect(screen.getByText("Pepperoni Pizza")).toBeInTheDocument();
    expect(screen.getByAltText("Pepperoni Pizza")).toBeInTheDocument();
    expect(screen.getByText(/Size: Large/)).toBeInTheDocument();
    expect(screen.getByText(/Toppings: Extra Cheese/)).toBeInTheDocument();
    expect(screen.getByText("$26.00")).toBeInTheDocument();
  });

  it("'+' calls updateCartQuantity with qty + 1", async () => {
    const user = userEvent.setup();
    render(<CartItemCard item={baseItem} />);
    // qty buttons: − then qty then +
    const buttons = document.querySelectorAll("button");
    const plus = Array.from(buttons).find((b) =>
      b.querySelector("svg.lucide-plus"),
    )!;
    await user.click(plus);
    await waitFor(() => expect(updateQtyMock).toHaveBeenCalledWith(42, 3));
  });

  it("'−' calls updateCartQuantity with qty - 1", async () => {
    const user = userEvent.setup();
    render(<CartItemCard item={baseItem} />);
    const buttons = document.querySelectorAll("button");
    const minus = Array.from(buttons).find((b) =>
      b.querySelector("svg.lucide-minus"),
    )!;
    await user.click(minus);
    await waitFor(() => expect(updateQtyMock).toHaveBeenCalledWith(42, 1));
  });

  it("'−' at qty=1 calls updateCartQuantity with 0 (which the action interprets as remove)", async () => {
    const user = userEvent.setup();
    render(<CartItemCard item={{ ...baseItem, quantity: 1, lineTotal: 1000 }} />);
    const buttons = document.querySelectorAll("button");
    const minus = Array.from(buttons).find((b) =>
      b.querySelector("svg.lucide-minus"),
    )!;
    await user.click(minus);
    await waitFor(() => expect(updateQtyMock).toHaveBeenCalledWith(42, 0));
  });

  it("trash button calls removeFromCart with the item id", async () => {
    const user = userEvent.setup();
    render(<CartItemCard item={baseItem} />);
    const trashBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-trash-2"),
    )!;
    await user.click(trashBtn);
    await waitFor(() => expect(removeMock).toHaveBeenCalledWith(42));
  });

  it("special instructions textarea is hidden by default and revealed on toggle", async () => {
    const user = userEvent.setup();
    render(<CartItemCard item={baseItem} />);
    expect(screen.queryByPlaceholderText(/No onions/)).not.toBeInTheDocument();

    const toggle = screen.getByText(/Add special instructions/i).closest("button")!;
    await user.click(toggle);
    expect(screen.getByPlaceholderText(/No onions/)).toBeInTheDocument();
  });
});

describe("CartItemCard — debounced notes save", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces updateSpecialInstructions by 800ms after typing", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CartItemCard item={baseItem} />);

    const toggle = screen.getByText(/Add special instructions/i).closest("button")!;
    await user.click(toggle);

    const textarea = screen.getByPlaceholderText(/No onions/);
    await user.type(textarea, "no salt");

    // Before debounce elapses, action should not have fired
    expect(updateInstrMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(900);
    });

    await waitFor(() => expect(updateInstrMock).toHaveBeenCalled());
    const lastCall = updateInstrMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe(42);
    expect(lastCall?.[1]).toContain("no salt");
  });
});

describe("CartItemCard — edit link (modifiers only)", () => {
  it("renders an edit link to the item detail page with edit/qty/mods query params", () => {
    render(
      <CartItemCard
        item={{
          ...baseItem,
          modifiers: [
            { id: 11, name: "Large", priceAdjustment: 200, groupName: "Size" },
            { id: 12, name: "Cheese", priceAdjustment: 100, groupName: "Toppings" },
          ],
        }}
      />,
    );
    const editLink = Array.from(document.querySelectorAll("a")).find((a) =>
      a.getAttribute("title") === "Edit item",
    );
    expect(editLink).toBeDefined();
    const href = editLink!.getAttribute("href")!;
    expect(href).toContain("/menu/pizza/pepperoni-pizza");
    expect(href).toContain("edit=42");
    expect(href).toContain("qty=2");
    expect(href).toContain("mods=11,12");
  });

  it("does NOT render the edit link when the item has no modifiers", () => {
    render(<CartItemCard item={baseItem} />);
    const editLink = Array.from(document.querySelectorAll("a")).find((a) =>
      a.getAttribute("title") === "Edit item",
    );
    expect(editLink).toBeUndefined();
  });
});
