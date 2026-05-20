import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";
const { default: AIFloatingButton } = await import("./AIFloatingButton");

const usePathnameMock = vi.mocked(usePathname);

beforeEach(() => {
  usePathnameMock.mockReset();
});

describe("AIFloatingButton", () => {
  it("renders an anchor to /order-ai with the expected aria-label", () => {
    usePathnameMock.mockReturnValue("/");
    render(<AIFloatingButton />);
    const link = screen.getByRole("link", { name: "Order with AI" });
    expect(link.getAttribute("href")).toBe("/order-ai");
  });

  it("renders with opacity-100 on non-/order-ai pages", () => {
    usePathnameMock.mockReturnValue("/menu");
    render(<AIFloatingButton />);
    const link = screen.getByRole("link", { name: "Order with AI" });
    expect(link.className).toMatch(/opacity-100/);
    expect(link.className).not.toMatch(/pointer-events-none/);
  });

  it("hides itself on /order-ai (opacity-0 + pointer-events-none)", () => {
    usePathnameMock.mockReturnValue("/order-ai");
    render(<AIFloatingButton />);
    const link = screen.getByRole("link", { name: "Order with AI" });
    expect(link.className).toMatch(/opacity-0/);
    expect(link.className).toMatch(/pointer-events-none/);
  });

  it("renders an avatar image with the alt text 'FlavorJet AI'", () => {
    usePathnameMock.mockReturnValue("/");
    render(<AIFloatingButton />);
    expect(screen.getByAltText("FlavorJet AI")).toBeInTheDocument();
  });
});
