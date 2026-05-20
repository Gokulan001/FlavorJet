import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { default: MenuPage } = await import("./page");
const { resetTestDb, seedHomepageFixtures, getTestSqlite } = await import("@/test/db");

beforeEach(() => {
  resetTestDb();
});

describe("MenuPage", () => {
  it("renders all seeded categories with their item counts", () => {
    seedHomepageFixtures();
    render(<MenuPage />);

    // Seed has 36 items distributed across 5 categories (8 in first, 7 in others — round-robin)
    // Just verify each category name appears AND an "X items" label is present
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Dessert")).toBeInTheDocument();
    expect(screen.getByText("Drinks")).toBeInTheDocument();

    // First category gets items 1,6,11,16,21,26,31,36 = 8 items
    expect(screen.getByText("8 items")).toBeInTheDocument();
  });

  it("each category card links to /menu/{slug}", () => {
    seedHomepageFixtures();
    render(<MenuPage />);
    const breakfastLink = screen.getByText("Breakfast").closest("a");
    expect(breakfastLink?.getAttribute("href")).toBe("/menu/breakfast");
    const drinksLink = screen.getByText("Drinks").closest("a");
    expect(drinksLink?.getAttribute("href")).toBe("/menu/drinks");
  });

  it("shows '0 items' for categories with no menu items", () => {
    // Seed just categories, no items
    const insert = getTestSqlite().prepare(
      "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
    );
    insert.run("Empty Category", "empty", "no items", "/img/empty.jpg", 1);

    render(<MenuPage />);
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });
});
