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

const { default: ItemDetailPage } = await import("./page");
const { resetTestDb, seedHomepageFixtures, getTestSqlite, seedMenuItemWithModifiers } =
  await import("@/test/db");
const { NotFoundError } = await import("@/test/mocks/next-navigation");

async function renderPage(args: {
  categorySlug: string;
  itemSlug: string;
  edit?: string;
  qty?: string;
  mods?: string;
}) {
  const { categorySlug, itemSlug, ...sp } = args;
  const elem = await ItemDetailPage({
    params: Promise.resolve({ categorySlug, itemSlug }),
    searchParams: Promise.resolve(sp),
  });
  return render(elem as React.ReactElement);
}

beforeEach(() => {
  resetTestDb();
});

describe("ItemDetailPage", () => {
  it("renders the item name, description, and breadcrumb", async () => {
    seedHomepageFixtures();
    await renderPage({ categorySlug: "breakfast", itemSlug: "item-1" });
    expect(screen.getByRole("heading", { name: "Item 1" })).toBeInTheDocument();
    expect(screen.getByText("Description for item 1")).toBeInTheDocument();
  });

  it("throws NotFoundError when the category doesn't exist", async () => {
    seedHomepageFixtures();
    await expect(
      ItemDetailPage({
        params: Promise.resolve({ categorySlug: "ghost-cat", itemSlug: "item-1" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the item slug doesn't exist under the category", async () => {
    seedHomepageFixtures();
    await expect(
      ItemDetailPage({
        params: Promise.resolve({ categorySlug: "breakfast", itemSlug: "ghost-item" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("renders AddToCartButton (no modifiers) for an item without modifier groups", async () => {
    seedHomepageFixtures();
    await renderPage({ categorySlug: "breakfast", itemSlug: "item-1" });
    // AddToCartButton has button text containing "Add to Cart"
    expect(screen.getByRole("button", { name: /Add to Cart/i })).toBeInTheDocument();
    // ModifierSelector has groups; if absent, no modifier group cards rendered
    expect(screen.queryByText("Required")).not.toBeInTheDocument();
  });

  it("renders ModifierSelector when the item has modifier groups", async () => {
    const { categoryIds } = seedHomepageFixtures();
    seedMenuItemWithModifiers(categoryIds[0], "Custom Pizza", [
      {
        name: "Size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [
          { name: "Small", priceAdjustment: 0 },
          { name: "Large", priceAdjustment: 500 },
        ],
      },
    ]);
    await renderPage({ categorySlug: "breakfast", itemSlug: "custom-pizza" });
    // ModifierSelector renders the group heading
    expect(screen.getByRole("heading", { name: "Size" })).toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("shows 'Currently Unavailable' state when isAvailable=false", async () => {
    const { categoryIds } = seedHomepageFixtures();
    getTestSqlite()
      .prepare(
        "INSERT INTO menu_items (category_id, name, slug, description, price, image_url, is_available) VALUES (?, ?, ?, ?, ?, ?, 0)",
      )
      .run(categoryIds[0], "Out of Stock", "out-of-stock", "Sold out", 1000, "/x.jpg");

    await renderPage({ categorySlug: "breakfast", itemSlug: "out-of-stock" });

    expect(screen.getByText("Currently Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/This item is currently unavailable/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add to Cart/i })).not.toBeInTheDocument();
  });

  it("passes editCartItemId / quantity / modifiers to ModifierSelector via query params", async () => {
    const { categoryIds } = seedHomepageFixtures();
    const { modifierIds } = seedMenuItemWithModifiers(categoryIds[0], "Editable", [
      {
        name: "Size",
        required: true,
        minSelect: 1,
        maxSelect: 1,
        modifiers: [{ name: "Large", priceAdjustment: 200 }],
      },
    ]);

    await renderPage({
      categorySlug: "breakfast",
      itemSlug: "editable",
      edit: "99",
      qty: "3",
      mods: modifierIds.join(","),
    });

    // Edit mode flips button label from "Add to Cart" to "Update Cart"
    expect(screen.getByRole("button", { name: /Update Cart/i })).toBeInTheDocument();
  });

  it("renders related items from the same category (up to 3)", async () => {
    seedHomepageFixtures();
    await renderPage({ categorySlug: "breakfast", itemSlug: "item-1" });
    // "More from Breakfast" heading appears when related items exist
    expect(screen.getByRole("heading", { name: /More from Breakfast/ })).toBeInTheDocument();
  });
});
