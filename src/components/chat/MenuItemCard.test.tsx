import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MinimalMenuItem } from "./types";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("./MenuImagesContext", () => ({
  useMenuImages: () => new Map([["pizza-no-image-slug", "/from-context.jpg"]]),
  MenuImagesProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { default: MenuItemCard } = await import("./MenuItemCard");

function makeItem(overrides: Partial<MinimalMenuItem> = {}): MinimalMenuItem {
  return {
    name: "Pizza",
    price: "$12.00",
    slug: "pizza",
    rating: "4.5",
    hasModifiers: false,
    vegan: false,
    vegetarian: false,
    glutenFree: false,
    ...overrides,
  };
}

describe("MenuItemCard", () => {
  it("renders the item name, price, and rating", () => {
    render(<MenuItemCard item={makeItem()} index={0} />);
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
  });

  it("shows the ShoppingCart button for items without modifiers and calls onAddToCart", async () => {
    const onAddToCart = vi.fn();
    const onCustomize = vi.fn();
    render(
      <MenuItemCard
        item={makeItem({ hasModifiers: false })}
        index={0}
        onAddToCart={onAddToCart}
        onCustomize={onCustomize}
      />,
    );
    const btn = screen.getByTitle("Add to cart");
    await userEvent.click(btn);
    expect(onAddToCart).toHaveBeenCalledWith("pizza");
    expect(onCustomize).not.toHaveBeenCalled();
  });

  it("shows the Customize button for items with modifiers and calls onCustomize", async () => {
    const onAddToCart = vi.fn();
    const onCustomize = vi.fn();
    render(
      <MenuItemCard
        item={makeItem({ hasModifiers: true })}
        index={0}
        onAddToCart={onAddToCart}
        onCustomize={onCustomize}
      />,
    );
    const btn = screen.getByTitle("Customize");
    await userEvent.click(btn);
    expect(onCustomize).toHaveBeenCalledWith("pizza");
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it("card click on a non-modifier item adds to cart", async () => {
    const onAddToCart = vi.fn();
    render(<MenuItemCard item={makeItem()} index={0} onAddToCart={onAddToCart} />);
    await userEvent.click(screen.getByText("Pizza"));
    expect(onAddToCart).toHaveBeenCalledWith("pizza");
  });

  it("card click on a modifier item triggers customize", async () => {
    const onCustomize = vi.fn();
    render(
      <MenuItemCard
        item={makeItem({ hasModifiers: true })}
        index={0}
        onCustomize={onCustomize}
      />,
    );
    await userEvent.click(screen.getByText("Pizza"));
    expect(onCustomize).toHaveBeenCalledWith("pizza");
  });

  it("renders dietary badges (VG / V / GF)", () => {
    const { rerender } = render(
      <MenuItemCard item={makeItem({ vegan: true, glutenFree: true })} index={0} />,
    );
    expect(screen.getByText("VG")).toBeInTheDocument();
    expect(screen.getByText("GF")).toBeInTheDocument();

    rerender(<MenuItemCard item={makeItem({ vegetarian: true })} index={0} />);
    expect(screen.getByText("V")).toBeInTheDocument();
  });

  it("resolves image URL from MenuImagesContext when item has no imageUrl", () => {
    render(
      <MenuItemCard
        item={makeItem({ slug: "pizza-no-image-slug", imageUrl: undefined })}
        index={0}
      />,
    );
    const img = screen.getByAltText("Pizza") as HTMLImageElement;
    expect(img.src).toContain("/from-context.jpg");
  });

  it("falls back to the food emoji when no image is available", () => {
    render(
      <MenuItemCard
        item={makeItem({ slug: "no-image-anywhere", imageUrl: undefined })}
        index={0}
      />,
    );
    // Emoji span with aria-label="food"
    expect(screen.getByLabelText("food")).toBeInTheDocument();
  });
});
