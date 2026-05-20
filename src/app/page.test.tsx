import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

const { default: HomePage } = await import("./page");
const { resetTestDb, seedHomepageFixtures } = await import("@/test/db");

beforeEach(() => {
  resetTestDb();
  seedHomepageFixtures();
});

describe("Home page — smoke", () => {
  it("renders without throwing", () => {
    expect(() => render(<HomePage />)).not.toThrow();
  });

  it("mounts the HeroBanner (slide 0 content visible)", () => {
    render(<HomePage />);
    expect(screen.getByText("Welcome to FlavorJet")).toBeInTheDocument();
    expect(screen.getByText("Premium Steak")).toBeInTheDocument();
  });

  it("mounts the CategoriesSection (seeded categories rendered as links)", () => {
    render(<HomePage />);
    // "Breakfast" also appears as a PopularMenuTabs tab label, so query by the
    // CategoriesSection's anchor card pointing to /menu/{slug}
    const breakfastLink = document.querySelector('a[href="/menu/breakfast"]');
    expect(breakfastLink).not.toBeNull();
    const drinksLink = document.querySelector('a[href="/menu/drinks"]');
    expect(drinksLink).not.toBeNull();
  });

  it("mounts the ServicesSection (Master Chefs service card heading)", () => {
    render(<HomePage />);
    // "Master Chefs" appears in ServicesSection (h3) and AboutSection (p label).
    // Scope to the service card's h3 to avoid the AboutSection paragraph.
    expect(
      screen.getByRole("heading", { level: 3, name: "Master Chefs" }),
    ).toBeInTheDocument();
  });

  it("mounts the ChefsSection (Our Master Chefs heading)", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 2, name: "Our Master Chefs" }),
    ).toBeInTheDocument();
  });

  it("mounts the PopularMenuSection (heading + first item visible)", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: "Most Popular Items" }),
    ).toBeInTheDocument();
    // "Item 1" is the first seeded menu item; should appear on the breakfast tab.
    const allItems = screen.getAllByText("Item 1");
    expect(allItems.length).toBeGreaterThanOrEqual(1);
  });
});
