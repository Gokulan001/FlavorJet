import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routerPush = vi.fn();

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/cart",
}));

vi.mock("@/actions/cart-actions", () => ({
  quickAddToCart: vi.fn(),
}));

import { quickAddToCart } from "@/actions/cart-actions";
const { default: CartRecommendations } = await import("./CartRecommendations");

const quickAddMock = vi.mocked(quickAddToCart);

const makeItem = (overrides: Partial<{
  id: number;
  name: string;
  slug: string;
  price: number;
  imageUrl: string;
  rating: string;
  categorySlug: string;
  categoryName: string;
  hasModifiers: boolean;
}> = {}) => ({
  id: 1,
  name: "Wings",
  slug: "wings",
  price: 1200,
  imageUrl: "/img/wings.jpg",
  rating: "4.5",
  categorySlug: "appetizers",
  categoryName: "Appetizers",
  hasModifiers: false,
  ...overrides,
});

beforeEach(() => {
  routerPush.mockClear();
  quickAddMock.mockReset();
});

describe("CartRecommendations", () => {
  it("returns null when items is empty", () => {
    const { container } = render(<CartRecommendations items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders each item's name, category, and price", () => {
    render(
      <CartRecommendations
        items={[
          makeItem({ id: 1, name: "Wings", price: 1200, categoryName: "Appetizers" }),
          makeItem({ id: 2, name: "Cake", slug: "cake", price: 800, categoryName: "Desserts" }),
        ]}
      />,
    );
    expect(screen.getByText("Wings")).toBeInTheDocument();
    expect(screen.getByText("Cake")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText("$8.00")).toBeInTheDocument();
  });

  it("renders a 'Customize' link for items with modifiers", () => {
    render(
      <CartRecommendations
        items={[makeItem({ id: 1, name: "Pizza", slug: "pizza", hasModifiers: true, categorySlug: "pizza" })]}
      />,
    );
    const customize = screen.getByRole("link", { name: "Customize" });
    expect(customize.getAttribute("href")).toBe("/menu/pizza/pizza");
  });

  it("renders a '+' add button for items without modifiers", () => {
    render(<CartRecommendations items={[makeItem({ hasModifiers: false })]} />);
    // CompactAddButton has no aria-label; locate via its lucide-plus icon
    const plusBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-plus"),
    );
    expect(plusBtn).toBeDefined();
  });

  it("clicking the '+' button calls quickAddToCart with the item id", async () => {
    quickAddMock.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<CartRecommendations items={[makeItem({ id: 77, hasModifiers: false })]} />);

    const plusBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-plus"),
    )!;
    await user.click(plusBtn);

    await waitFor(() => expect(quickAddMock).toHaveBeenCalledWith(77));
  });

  it("redirects to /login?redirect={encodedPathname} when quickAddToCart returns not_authenticated", async () => {
    quickAddMock.mockResolvedValue({ error: "not_authenticated" });
    const user = userEvent.setup();
    render(<CartRecommendations items={[makeItem({ id: 1, hasModifiers: false })]} />);

    const plusBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-plus"),
    )!;
    await user.click(plusBtn);

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        "/login?redirect=" + encodeURIComponent("/cart"),
      ),
    );
  });
});

describe("CartRecommendations — 'Added' feedback", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a check icon after success and clears after 2000ms", async () => {
    quickAddMock.mockResolvedValue({ success: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CartRecommendations items={[makeItem({ id: 1, hasModifiers: false })]} />);

    const plusBtn = Array.from(document.querySelectorAll("button")).find((b) =>
      b.querySelector("svg.lucide-plus"),
    )!;
    await user.click(plusBtn);

    await waitFor(() => {
      expect(plusBtn.querySelector("svg.lucide-check")).toBeTruthy();
    });

    await act(async () => {
      vi.advanceTimersByTime(2100);
    });

    expect(plusBtn.querySelector("svg.lucide-check")).toBeFalsy();
  });
});
