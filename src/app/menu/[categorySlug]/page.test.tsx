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

const { default: CategoryPage } = await import("./page");
const { resetTestDb, seedHomepageFixtures, getTestSqlite, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { NotFoundError } = await import("@/test/mocks/next-navigation");

async function renderPage(slug: string) {
  const elem = await CategoryPage({ params: Promise.resolve({ categorySlug: slug }) });
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
});

describe("CategoryPage", () => {
  it("renders the category banner and all items in that category", async () => {
    seedHomepageFixtures();
    await renderPage("breakfast");

    // Banner heading
    expect(screen.getByRole("heading", { name: "Breakfast" })).toBeInTheDocument();
    // First seeded item that belongs to Breakfast (round-robin: Item 1)
    expect(screen.getByText("Item 1")).toBeInTheDocument();
  });

  it("throws NotFoundError when the category slug doesn't exist", async () => {
    seedHomepageFixtures();
    await expect(
      CategoryPage({ params: Promise.resolve({ categorySlug: "nonexistent" }) }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("shows 'No items in this category yet.' when category exists but has no items", async () => {
    getTestSqlite()
      .prepare(
        "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
      )
      .run("Empty", "empty-cat", "no items here", "/img/empty.jpg", 99);

    await renderPage("empty-cat");
    expect(screen.getByText("No items in this category yet.")).toBeInTheDocument();
  });

  it("uses the 'Customize' link instead of QuickAddButton when an item has modifiers", async () => {
    const { categoryIds } = seedHomepageFixtures();
    seedMenuItemWithModifiers(categoryIds[0], "Mod Pizza", [
      {
        name: "Toppings",
        maxSelect: 3,
        modifiers: [{ name: "Cheese", priceAdjustment: 100 }],
      },
    ]);
    await renderPage("breakfast");

    expect(screen.getByText("Mod Pizza")).toBeInTheDocument();
    // The "Customize" anchor link points to the item's detail page
    const customizeLinks = screen.getAllByText("Customize");
    expect(customizeLinks.length).toBeGreaterThanOrEqual(1);
    expect(customizeLinks[0].closest("a")?.getAttribute("href")).toBe(
      "/menu/breakfast/mod-pizza",
    );
  });

  it("renders the 'Back to All Categories' breadcrumb link to /menu", async () => {
    seedHomepageFixtures();
    await renderPage("breakfast");
    const allCatsLinks = screen.getAllByRole("link").filter(
      (l) => l.getAttribute("href") === "/menu",
    );
    expect(allCatsLinks.length).toBeGreaterThanOrEqual(1);
  });
});
