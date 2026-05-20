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
  usePathname: () => "/menu/mains/pizza",
}));

vi.mock("@/actions/cart-actions", () => ({
  quickAddToCart: vi.fn(),
}));

vi.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({ toast: toastFn }),
}));

import { quickAddToCart } from "@/actions/cart-actions";
const { default: QuickAddButton } = await import("./QuickAddButton");
const quickAddMock = vi.mocked(quickAddToCart);

beforeEach(() => {
  routerPush.mockClear();
  toastFn.mockClear();
  quickAddMock.mockReset();
});

describe("QuickAddButton", () => {
  it("calls quickAddToCart with the menuItemId on click", async () => {
    quickAddMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<QuickAddButton menuItemId={42} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(quickAddMock).toHaveBeenCalledWith(42));
  });

  it("shows 'Added!' state and success toast on success", async () => {
    quickAddMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<QuickAddButton menuItemId={1} />);
    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("Added!")).toBeInTheDocument();
    });
    expect(toastFn).toHaveBeenCalledWith("Added to cart!", "success");
  });

  it("redirects to /login?redirect={encodedPathname} when not authenticated", async () => {
    quickAddMock.mockResolvedValue({ error: "not_authenticated" });
    const user = userEvent.setup();
    render(<QuickAddButton menuItemId={1} />);
    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        "/login?redirect=" + encodeURIComponent("/menu/mains/pizza"),
      ),
    );
    expect(toastFn).not.toHaveBeenCalled();
  });

  it("shows error toast for other errors", async () => {
    quickAddMock.mockResolvedValue({ error: "Failed to add item to cart" });
    const user = userEvent.setup();
    render(<QuickAddButton menuItemId={1} />);
    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(toastFn).toHaveBeenCalledWith("Failed to add item to cart", "error"),
    );
    expect(routerPush).not.toHaveBeenCalled();
  });
});
