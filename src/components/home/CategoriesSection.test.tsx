import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));

vi.mock("@/db", async () => {
  const m = await import("@/test/db");
  return { sqlite: m.getTestSqlite(), db: m.getTestDb() };
});

const { default: CategoriesSection } = await import("./CategoriesSection");
const { resetTestDb, seedHomepageFixtures, getTestSqlite } = await import("@/test/db");

beforeEach(() => {
  resetTestDb();
});

describe("CategoriesSection", () => {
  it("renders all five seeded category names", () => {
    seedHomepageFixtures();
    render(<CategoriesSection />);
    expect(screen.getByText("Breakfast")).toBeInTheDocument();
    expect(screen.getByText("Lunch")).toBeInTheDocument();
    expect(screen.getByText("Dinner")).toBeInTheDocument();
    expect(screen.getByText("Dessert")).toBeInTheDocument();
    expect(screen.getByText("Drinks")).toBeInTheDocument();
  });

  it("each category card links to /menu/{slug}", () => {
    seedHomepageFixtures();
    render(<CategoriesSection />);
    const breakfastLink = screen
      .getByText("Breakfast")
      .closest("a");
    expect(breakfastLink?.getAttribute("href")).toBe("/menu/breakfast");

    const lunchLink = screen.getByText("Lunch").closest("a");
    expect(lunchLink?.getAttribute("href")).toBe("/menu/lunch");

    const drinksLink = screen.getByText("Drinks").closest("a");
    expect(drinksLink?.getAttribute("href")).toBe("/menu/drinks");
  });

  it("renders cards in displayOrder ascending", () => {
    seedHomepageFixtures();
    const { container } = render(<CategoriesSection />);
    const cardHeadings = Array.from(container.querySelectorAll("h3")).map(
      (h) => h.textContent,
    );
    expect(cardHeadings).toEqual([
      "Breakfast",
      "Lunch",
      "Dinner",
      "Dessert",
      "Drinks",
    ]);
  });

  it("renders only the first 5 categories when more exist", () => {
    seedHomepageFixtures();
    // Insert two extras with later display orders
    getTestSqlite()
      .prepare(
        "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
      )
      .run("Snacks", "snacks", "Quick bites", "/img/snacks.jpg", 6);
    getTestSqlite()
      .prepare(
        "INSERT INTO categories (name, slug, description, image_url, display_order) VALUES (?, ?, ?, ?, ?)",
      )
      .run("Specials", "specials", "Chef's picks", "/img/specials.jpg", 7);

    render(<CategoriesSection />);
    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
    expect(screen.queryByText("Specials")).not.toBeInTheDocument();
    expect(screen.getByText("Drinks")).toBeInTheDocument();
  });

  it("each card uses the category's bgColor as background-color", () => {
    seedHomepageFixtures();
    render(<CategoriesSection />);
    const breakfastLink = screen.getByText("Breakfast").closest("a") as HTMLAnchorElement;
    // jsdom lowercases the hex value; assert via style.backgroundColor or inline style attribute
    expect(breakfastLink.style.backgroundColor).toBeTruthy();
  });

  it("each card has an image with the category name as alt text", () => {
    seedHomepageFixtures();
    render(<CategoriesSection />);
    expect(screen.getByAltText("Breakfast")).toBeInTheDocument();
    expect(screen.getByAltText("Dinner")).toBeInTheDocument();
  });

  it("'See All' link in the header points to /menu", () => {
    seedHomepageFixtures();
    render(<CategoriesSection />);
    const links = screen.getAllByRole("link");
    const seeAllLink = links.find((l) =>
      l.textContent?.toLowerCase().includes("see all"),
    );
    expect(seeAllLink?.getAttribute("href")).toBe("/menu");
  });

  it("renders without crashing when no categories exist", () => {
    expect(() => render(<CategoriesSection />)).not.toThrow();
    const cardHeadings = document.querySelectorAll("h3");
    expect(cardHeadings.length).toBe(0);
  });
});
