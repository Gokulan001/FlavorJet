import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerPush = vi.fn();
const toastFn = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/menu/mains/burger",
}));

vi.mock("@/actions/cart-actions", () => ({
  addToCart: vi.fn(),
}));

vi.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({ toast: toastFn }),
}));

import { addToCart } from "@/actions/cart-actions";
const { default: AddToCartButton } = await import("./AddToCartButton");
const addToCartMock = vi.mocked(addToCart);

beforeEach(() => {
  routerPush.mockClear();
  toastFn.mockClear();
  addToCartMock.mockReset();
});

function findQuantityButtons(container: HTMLElement) {
  // Quantity − and + are the first two buttons; Add to Cart is the third.
  const buttons = container.querySelectorAll("button");
  return { minus: buttons[0], plus: buttons[1], submit: buttons[2] };
}

describe("AddToCartButton", () => {
  it("starts with quantity 1", () => {
    render(<AddToCartButton menuItemId={1} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("+ button increases quantity, − decreases it", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { minus, plus } = findQuantityButtons(container);

    await user.click(plus);
    await user.click(plus);
    expect(screen.getByText("3")).toBeInTheDocument();

    await user.click(minus);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("does not go below 1 when − is clicked at 1", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { minus } = findQuantityButtons(container);
    await user.click(minus);
    await user.click(minus);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("calls addToCart with the menuItemId and current quantity", async () => {
    addToCartMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={7} />);
    const { plus, submit } = findQuantityButtons(container);
    await user.click(plus);
    await user.click(plus);
    await user.click(submit);

    await waitFor(() => expect(addToCartMock).toHaveBeenCalledWith(7, 3));
  });

  it("uses singular toast message when quantity is 1", async () => {
    addToCartMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { submit } = findQuantityButtons(container);
    await user.click(submit);

    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Added 1 item to cart!", "success"),
    );
  });

  it("uses plural toast message when quantity > 1", async () => {
    addToCartMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { plus, submit } = findQuantityButtons(container);
    await user.click(plus);
    await user.click(submit);

    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Added 2 items to cart!", "success"),
    );
  });

  it("redirects to /login when not authenticated", async () => {
    addToCartMock.mockResolvedValue({ error: "not_authenticated" });
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { submit } = findQuantityButtons(container);
    await user.click(submit);

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        "/login?redirect=" + encodeURIComponent("/menu/mains/burger"),
      ),
    );
  });

  it("shows error toast for other errors", async () => {
    addToCartMock.mockResolvedValue({ error: "Failed to add item to cart" });
    const user = userEvent.setup();
    const { container } = render(<AddToCartButton menuItemId={1} />);
    const { submit } = findQuantityButtons(container);
    await user.click(submit);
    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Failed to add item to cart", "error"),
    );
  });
});
