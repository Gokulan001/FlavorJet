import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { default: PopularMenuSection } = await import("./PopularMenuSection");
const { resetTestDb, seedHomepageFixtures, getTestSqlite } = await import("@/test/db");

beforeEach(() => {
  resetTestDb();
});

function countItemsByPrefix(prefix: string): number {
  return screen.getAllByText(new RegExp(`^${prefix} \\d+$`)).length;
}

describe("PopularMenuSection", () => {
  it("renders all three tabs from the nested PopularMenuTabs", () => {
    seedHomepageFixtures();
    render(<PopularMenuSection />);
    expect(screen.getByRole("button", { name: /Breakfast/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lunch/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dinner/ })).toBeInTheDocument();
  });

  it("splits 36 items into three groups of 12 (capped per tab)", async () => {
    seedHomepageFixtures();
    const user = userEvent.setup();
    render(<PopularMenuSection />);

    // First tab (breakfast = items 1..12)
    expect(countItemsByPrefix("Item")).toBe(12);

    // Switch to lunch (items 13..24)
    await user.click(screen.getByRole("button", { name: /Lunch/ }));
    expect(countItemsByPrefix("Item")).toBe(12);

    // Switch to dinner (items 25..36)
    await user.click(screen.getByRole("button", { name: /Dinner/ }));
    expect(countItemsByPrefix("Item")).toBe(12);
  });

  it("orders items by id ascending across the three tabs", async () => {
    seedHomepageFixtures();
    const user = userEvent.setup();
    render(<PopularMenuSection />);

    // Breakfast starts at Item 1
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 13")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Lunch/ }));
    expect(screen.getByText("Item 13")).toBeInTheDocument();
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Dinner/ }));
    expect(screen.getByText("Item 25")).toBeInTheDocument();
    expect(screen.getByText("Item 36")).toBeInTheDocument();
  });

  it("caps each tab at 12 items even with more than 36 in DB", () => {
    const { categoryIds } = seedHomepageFixtures();
    // Insert 15 extra menu items (now 51 total, third = 17)
    const insertItem = getTestSqlite().prepare(
      "INSERT INTO menu_items (category_id, name, slug, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (let i = 37; i <= 51; i++) {
      insertItem.run(categoryIds[0], `Item ${i}`, `item-${i}`, `desc ${i}`, 500 + i, `/img/${i}.jpg`);
    }

    render(<PopularMenuSection />);
    expect(countItemsByPrefix("Item")).toBe(12);
  });

  it("renders gracefully when only 10 items exist (under one full group)", () => {
    const { categoryIds } = seedHomepageFixtures();
    // Wipe and re-seed with just 10 items, reusing the seeded categories
    getTestSqlite().exec("DELETE FROM menu_items;");
    const insertItem = getTestSqlite().prepare(
      "INSERT INTO menu_items (category_id, name, slug, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (let i = 1; i <= 10; i++) {
      insertItem.run(categoryIds[0], `Small ${i}`, `small-${i}`, `desc ${i}`, 500, `/img/${i}.jpg`);
    }

    expect(() => render(<PopularMenuSection />)).not.toThrow();
    // 10 items / 3 = ceil 4 per group: breakfast = 4, lunch = 4, dinner = 2
    expect(countItemsByPrefix("Small")).toBe(4);
  });

  it("'View Full Menu' link points to /menu", () => {
    seedHomepageFixtures();
    render(<PopularMenuSection />);
    const viewFullLink = screen.getByRole("link", { name: /View Full Menu/ });
    expect(viewFullLink.getAttribute("href")).toBe("/menu");
  });

  it("renders the section heading 'Most Popular Items'", () => {
    seedHomepageFixtures();
    render(<PopularMenuSection />);
    expect(screen.getByRole("heading", { name: "Most Popular Items" })).toBeInTheDocument();
  });
});
