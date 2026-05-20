import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/menu/mains/pizza",
}));

vi.mock("@/actions/cart-actions", () => ({
  addToCart: vi.fn(),
  removeFromCart: vi.fn(),
}));

import { addToCart, removeFromCart } from "@/actions/cart-actions";
const { default: ModifierSelector } = await import("./ModifierSelector");
const addToCartMock = vi.mocked(addToCart);
const removeFromCartMock = vi.mocked(removeFromCart);

beforeEach(() => {
  routerPush.mockClear();
  addToCartMock.mockReset();
  removeFromCartMock.mockReset();
});

const sizeGroup = {
  id: 1,
  menuItemId: 100,
  name: "Size",
  required: true,
  minSelect: 1,
  maxSelect: 1,
  modifiers: [
    { id: 11, modifierGroupId: 1, name: "Small", priceAdjustment: 0 },
    { id: 12, modifierGroupId: 1, name: "Medium", priceAdjustment: 200 },
    { id: 13, modifierGroupId: 1, name: "Large", priceAdjustment: 500 },
  ],
};
const toppingsGroup = {
  id: 2,
  menuItemId: 100,
  name: "Toppings",
  required: false,
  minSelect: 0,
  maxSelect: 3,
  modifiers: [
    { id: 21, modifierGroupId: 2, name: "Cheese", priceAdjustment: 100 },
    { id: 22, modifierGroupId: 2, name: "Pepperoni", priceAdjustment: 150 },
    { id: 23, modifierGroupId: 2, name: "Olives", priceAdjustment: 75 },
    { id: 24, modifierGroupId: 2, name: "Onions", priceAdjustment: 0 },
  ],
};

describe("ModifierSelector — radio (maxSelect=1)", () => {
  it("toggles off when the same option is clicked again", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    const small = screen.getByText("Small").closest("button")!;
    await user.click(small);
    expect(small.className).toMatch(/border-\[#fea116\]/);
    await user.click(small);
    expect(small.className).not.toMatch(/border-\[#fea116\]/);
  });

  it("swaps selection when a different option is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    const small = screen.getByText("Small").closest("button")!;
    const large = screen.getByText("Large").closest("button")!;
    await user.click(small);
    await user.click(large);
    expect(small.className).not.toMatch(/border-\[#fea116\]/);
    expect(large.className).toMatch(/border-\[#fea116\]/);
  });
});

describe("ModifierSelector — checkbox (maxSelect>1)", () => {
  it("enforces the maxSelect upper bound (4th click ignored)", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[toppingsGroup]}
      />,
    );
    const cheese = screen.getByText("Cheese").closest("button")!;
    const pep = screen.getByText("Pepperoni").closest("button")!;
    const olives = screen.getByText("Olives").closest("button")!;
    const onions = screen.getByText("Onions").closest("button")!;

    await user.click(cheese);
    await user.click(pep);
    await user.click(olives);
    expect(cheese.className).toMatch(/border-\[#fea116\]/);
    expect(pep.className).toMatch(/border-\[#fea116\]/);
    expect(olives.className).toMatch(/border-\[#fea116\]/);

    await user.click(onions);
    expect(onions.className).not.toMatch(/border-\[#fea116\]/);
  });

  it("can deselect by clicking an already-selected modifier", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[toppingsGroup]}
      />,
    );
    const cheese = screen.getByText("Cheese").closest("button")!;
    await user.click(cheese);
    expect(cheese.className).toMatch(/border-\[#fea116\]/);
    await user.click(cheese);
    expect(cheese.className).not.toMatch(/border-\[#fea116\]/);
  });
});

describe("ModifierSelector — required validation", () => {
  it("shows 'Required' indicator when a required group has no selection", () => {
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    // The text "Required" appears both as the group label hint AND the red badge
    const requiredEls = screen.getAllByText("Required");
    expect(requiredEls.length).toBeGreaterThanOrEqual(2);
  });

  it("disables the Add to Cart button when a required group is unmet", () => {
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    const addBtn = screen.getByRole("button", { name: /Add to Cart/i });
    expect(addBtn).toBeDisabled();
  });

  it("enables Add to Cart once the required group is satisfied", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    const addBtn = screen.getByRole("button", { name: /Add to Cart/i });
    expect(addBtn).toBeDisabled();
    await user.click(screen.getByText("Small"));
    expect(addBtn).not.toBeDisabled();
  });
});

describe("ModifierSelector — price calculation", () => {
  it("computes total = (base + modifier adjustments) × quantity", async () => {
    const user = userEvent.setup();
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[sizeGroup, toppingsGroup]}
      />,
    );
    // base $10.00
    expect(screen.getByText(/\$10\.00/)).toBeInTheDocument();

    await user.click(screen.getByText("Large")); // +$5.00
    await user.click(screen.getByText("Cheese")); // +$1.00
    // Total = $16.00
    expect(screen.getByText(/\$16\.00/)).toBeInTheDocument();

    // Bump quantity to 2 → $32.00
    const qtyButtons = document.querySelectorAll("button");
    const plus = Array.from(qtyButtons).find((b) =>
      b.querySelector("svg.lucide-plus"),
    )!;
    await user.click(plus);
    expect(screen.getByText(/\$32\.00/)).toBeInTheDocument();
  });
});

describe("ModifierSelector — Add to Cart", () => {
  it("calls addToCart with menuItemId, quantity, and selected modifier ids", async () => {
    addToCartMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[sizeGroup, toppingsGroup]}
      />,
    );
    await user.click(screen.getByText("Medium")); // 12
    await user.click(screen.getByText("Cheese")); // 21
    await user.click(screen.getByRole("button", { name: /Add to Cart/i }));

    await waitFor(() =>
      expect(addToCartMock).toHaveBeenCalledWith(100, 1, expect.arrayContaining([12, 21])),
    );
  });

  it("redirects to /login when not authenticated", async () => {
    addToCartMock.mockResolvedValue({ error: "not_authenticated" });
    const user = userEvent.setup();
    render(
      <ModifierSelector menuItemId={100} basePrice={1000} modifierGroups={[sizeGroup]} />,
    );
    await user.click(screen.getByText("Small"));
    await user.click(screen.getByRole("button", { name: /Add to Cart/i }));

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        "/login?redirect=" + encodeURIComponent("/menu/mains/pizza"),
      ),
    );
  });
});

describe("ModifierSelector — edit mode", () => {
  it("removes the old cart item then adds the new one, then redirects to /cart", async () => {
    removeFromCartMock.mockResolvedValue(undefined);
    addToCartMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[sizeGroup]}
        editCartItemId={777}
        initialQuantity={2}
      />,
    );
    await user.click(screen.getByText("Large"));
    // Button label switches to "Update Cart" in edit mode
    await user.click(screen.getByRole("button", { name: /Update Cart/i }));

    await waitFor(() => expect(removeFromCartMock).toHaveBeenCalledWith(777));
    await waitFor(() => expect(addToCartMock).toHaveBeenCalled());
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/cart"));
  });

  it("pre-fills selected modifiers from initialModifierIds", () => {
    render(
      <ModifierSelector
        menuItemId={100}
        basePrice={1000}
        modifierGroups={[sizeGroup, toppingsGroup]}
        editCartItemId={1}
        initialQuantity={1}
        initialModifierIds={[12, 21]}
      />,
    );
    expect(screen.getByText("Medium").closest("button")?.className).toMatch(
      /border-\[#fea116\]/,
    );
    expect(screen.getByText("Cheese").closest("button")?.className).toMatch(
      /border-\[#fea116\]/,
    );
  });
});
