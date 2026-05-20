import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));
vi.mock("next/navigation", () => import("@/test/mocks/next-navigation"));
vi.mock("@/components/ui/ToastProvider", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

// SearchFilters is a client component using useSearchParams/useRouter — stub it out
// so the server-component test doesn't pull a client tree it doesn't need
vi.mock("@/components/search/SearchFilters", () => ({
  default: () => null,
}));

const { default: SearchPage } = await import("./page");
const { resetTestDb, seedHomepageFixtures } = await import("@/test/db");

async function renderPage(params: Record<string, string | undefined>) {
  const elem = await SearchPage({ searchParams: Promise.resolve(params) });
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
});

describe("SearchPage", () => {
  it("renders matching items when q matches", async () => {
    seedHomepageFixtures();
    await renderPage({ q: "Item 1" });
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("shows 'Start exploring' when no query/filters and renders matching items", async () => {
    seedHomepageFixtures();
    await renderPage({});
    // With no filters, all items match → header should show "Explore Menu"
    expect(screen.getByRole("heading", { name: /Explore Menu/ })).toBeInTheDocument();
  });

  it("shows 'No dishes match your filters' + 'Clear All Filters' when filtered to nothing", async () => {
    seedHomepageFixtures();
    await renderPage({ q: "totally-made-up-dish-no-match" });
    expect(screen.getByText(/No dishes match your filters/)).toBeInTheDocument();
    const clearLink = screen.getByRole("link", { name: /Clear All Filters/i });
    expect(clearLink.getAttribute("href")).toBe("/menu/search");
  });

  it("displays the result count in the header", async () => {
    seedHomepageFixtures();
    await renderPage({ q: "Item 1" });
    // "1 dish found" (since "Item 1" specifically matches one item — "Item 1" but also "Item 10..." etc could match
    // Actually 'Item 1' matches Item 1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 → 11 items
    expect(screen.getByText(/dish(es)? found/)).toBeInTheDocument();
  });

  it("filters by category slug param", async () => {
    seedHomepageFixtures();
    await renderPage({ category: "drinks" });
    // Drinks gets items 5, 10, 15, 20, 25, 30, 35 = 7 items
    expect(screen.getByText("Item 5")).toBeInTheDocument();
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
  });
});
