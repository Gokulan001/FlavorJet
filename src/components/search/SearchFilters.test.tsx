import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => import("@/test/mocks/next-navigation"));

const { default: SearchFilters } = await import("./SearchFilters");
const { routerPush } = await import("@/test/mocks/next-navigation");

const categories = [
  { id: 1, name: "Pizza", slug: "pizza" },
  { id: 2, name: "Burgers", slug: "burgers" },
  { id: 3, name: "Salads", slug: "salads" },
];
const priceRange = { min: 0, max: 5000 };

function setup() {
  render(<SearchFilters categories={categories} priceRange={priceRange} />);
}

describe("SearchFilters", () => {
  it("renders all category buttons", () => {
    setup();
    expect(screen.getByRole("button", { name: "Pizza" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Burgers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salads" })).toBeInTheDocument();
  });

  it("renders the search input", () => {
    setup();
    expect(screen.getByPlaceholderText("Search dishes...")).toBeInTheDocument();
  });

  it("renders all sort options", () => {
    setup();
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain("rating");
    expect(options).toContain("price_asc");
    expect(options).toContain("price_desc");
    expect(options).toContain("name_asc");
  });

  it("renders tag filter buttons", () => {
    setup();
    expect(screen.getByRole("button", { name: /Bestseller/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Spicy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New/i })).toBeInTheDocument();
  });

  it("clicking a category calls router.push with ?category=slug", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Pizza" }));
    expect(routerPush.some((url) => url.includes("category=pizza"))).toBe(true);
  });

  it("clicking a tag calls router.push with ?tags=value", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Bestseller/i }));
    expect(routerPush.some((url) => url.includes("tags=bestseller"))).toBe(true);
  });

  it("changing sort to price_asc calls router.push with ?sort=price_asc", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "price_asc");
    expect(routerPush.some((url) => url.includes("sort=price_asc"))).toBe(true);
  });

  it("changing sort back to rating removes the sort param from the URL", async () => {
    setup();
    await userEvent.selectOptions(screen.getByRole("combobox"), "price_asc");
    routerPush.length = 0; // reset to isolate next assertion
    await userEvent.selectOptions(screen.getByRole("combobox"), "rating");
    // routing back to rating means sort param is deleted → URL should not contain sort=
    expect(routerPush.some((url) => !url.includes("sort="))).toBe(true);
  });

  it("search input is debounced: router.push not called immediately on type", async () => {
    vi.useFakeTimers();
    try {
      setup();
      const input = screen.getByPlaceholderText("Search dishes...");
      fireEvent.change(input, { target: { value: "tacos" } });
      expect(routerPush.some((u) => u.includes("q="))).toBe(false);
      await vi.advanceTimersByTimeAsync(500);
      expect(routerPush.some((u) => u.includes("q=tacos"))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does NOT show 'Clear All Filters' button when there are no active filters", () => {
    setup();
    expect(screen.queryByRole("button", { name: /Clear All Filters/i })).not.toBeInTheDocument();
  });

  it("collapsing the Categories section hides the category buttons", async () => {
    setup();
    const categoriesHeader = screen.getByRole("button", { name: /Categories/i });
    await userEvent.click(categoriesHeader);
    expect(screen.queryByRole("button", { name: "Pizza" })).not.toBeInTheDocument();
  });

  it("collapsing then re-expanding Categories shows the buttons again", async () => {
    setup();
    const categoriesHeader = screen.getByRole("button", { name: /Categories/i });
    await userEvent.click(categoriesHeader); // collapse
    await userEvent.click(categoriesHeader); // expand
    expect(screen.getByRole("button", { name: "Pizza" })).toBeInTheDocument();
  });

  it("mobile: filter button is present in the DOM", () => {
    setup();
    // Mobile button with "Filters" text is always in the DOM (hidden via CSS on desktop)
    const filterButtons = screen.getAllByRole("button", { name: /Filters/i });
    expect(filterButtons.length).toBeGreaterThanOrEqual(1);
  });
});
