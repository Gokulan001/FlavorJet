import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => import("@/test/mocks/next-image"));

// AnimatePresence mode="wait" blocks new content from mounting until exit completes,
// which never happens in happy-dom. Replace it with a pass-through to make tab switches
// observable in tests.
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const { default: PopularMenuTabs } = await import("./PopularMenuTabs");

type Item = { name: string; description: string; price: number; imageUrl: string };

function makeItems(prefix: string, count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${prefix} ${i + 1}`,
    description: `${prefix} description ${i + 1}`,
    price: 100 * (i + 1),
    imageUrl: `/img/${prefix.toLowerCase()}-${i + 1}.jpg`,
  }));
}

const breakfast = makeItems("Breakfast", 3);
const lunch = makeItems("Lunch", 2);
const dinner = makeItems("Dinner", 4);

describe("PopularMenuTabs", () => {
  it("renders all three tab labels", () => {
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);
    expect(screen.getByRole("button", { name: /Breakfast/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Lunch/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Dinner/ })).toBeInTheDocument();
  });

  it("shows breakfast items by default", () => {
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);
    expect(screen.getByText("Breakfast 1")).toBeInTheDocument();
    expect(screen.getByText("Breakfast 2")).toBeInTheDocument();
    expect(screen.getByText("Breakfast 3")).toBeInTheDocument();
    expect(screen.queryByText("Lunch 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Dinner 1")).not.toBeInTheDocument();
  });

  it("clicking 'Lunch' switches to lunch items", async () => {
    const user = userEvent.setup();
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);

    await user.click(screen.getByRole("button", { name: /Lunch/ }));

    expect(screen.getByText("Lunch 1")).toBeInTheDocument();
    expect(screen.getByText("Lunch 2")).toBeInTheDocument();
    expect(screen.queryByText("Breakfast 1")).not.toBeInTheDocument();
  });

  it("clicking 'Dinner' switches to dinner items", async () => {
    const user = userEvent.setup();
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);

    await user.click(screen.getByRole("button", { name: /Dinner/ }));

    expect(screen.getByText("Dinner 1")).toBeInTheDocument();
    expect(screen.getByText("Dinner 4")).toBeInTheDocument();
    expect(screen.queryByText("Breakfast 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Lunch 1")).not.toBeInTheDocument();
  });

  it("renders each item's formatted price (cents → $X.XX)", () => {
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);
    expect(screen.getByText("$1.00")).toBeInTheDocument(); // 100 cents
    expect(screen.getByText("$2.00")).toBeInTheDocument(); // 200 cents
    expect(screen.getByText("$3.00")).toBeInTheDocument(); // 300 cents
  });

  it("each item card has the item's image with alt text", () => {
    const { container } = render(
      <PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />,
    );
    const imgs = container.querySelectorAll("img");
    expect(imgs.length).toBe(breakfast.length);
    const alts = Array.from(imgs).map((i) => i.getAttribute("alt"));
    expect(alts).toEqual(["Breakfast 1", "Breakfast 2", "Breakfast 3"]);
  });

  it("active tab button is styled differently from inactive ones", async () => {
    const user = userEvent.setup();
    render(<PopularMenuTabs breakfast={breakfast} lunch={lunch} dinner={dinner} />);
    const breakfastBtn = screen.getByRole("button", { name: /Breakfast/ });
    const lunchBtn = screen.getByRole("button", { name: /Lunch/ });

    expect(breakfastBtn.className).toMatch(/bg-\[#fea116\]/);
    expect(lunchBtn.className).not.toMatch(/bg-\[#fea116\]/);

    await user.click(lunchBtn);
    expect(lunchBtn.className).toMatch(/bg-\[#fea116\]/);
    expect(breakfastBtn.className).not.toMatch(/bg-\[#fea116\]/);
  });

  it("handles empty arrays gracefully", () => {
    expect(() =>
      render(<PopularMenuTabs breakfast={[]} lunch={[]} dinner={[]} />),
    ).not.toThrow();
    expect(screen.getByRole("button", { name: /Breakfast/ })).toBeInTheDocument();
  });
});
