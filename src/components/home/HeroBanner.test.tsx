import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/link", () => import("@/test/mocks/next-link"));

const { default: HeroBanner } = await import("./HeroBanner");

const SLIDE_DURATION_MS = 7000;
const TEXT_FADE_MS = 300;
const CROSSFADE_MS = 1200;

describe("HeroBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders one slide-indicator button per slide", () => {
    render(<HeroBanner />);
    const indicators = screen.getAllByRole("button", { name: /Go to slide \d+/ });
    expect(indicators.length).toBe(6);
  });

  it("renders the first slide content on mount", () => {
    render(<HeroBanner />);
    expect(screen.getByText("Welcome to FlavorJet")).toBeInTheDocument();
    expect(screen.getByText("Premium Steak")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
  });

  it("renders the cinematic slide counter '01 / 06'", () => {
    render(<HeroBanner />);
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("/ 06")).toBeInTheDocument();
  });

  it("renders six <video> elements with their src", () => {
    const { container } = render(<HeroBanner />);
    const sources = container.querySelectorAll("video source");
    expect(sources.length).toBe(6);
    expect(sources[0].getAttribute("src")).toBe("/videos/steak.mp4");
    expect(sources[5].getAttribute("src")).toBe("/videos/migon.mp4");
  });

  it("clicking a slide indicator advances to that slide after the transition completes", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<HeroBanner />);

    // Click "Go to slide 3" — index 2 in the slides array
    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));

    // Advance text fade (300ms) + crossfade (1200ms)
    await act(async () => {
      vi.advanceTimersByTime(TEXT_FADE_MS + CROSSFADE_MS + 10);
    });

    // Slide 2 = "Wood Fired Pizza" with subtitle "Handcrafted Daily"
    expect(screen.getByText("Handcrafted Daily")).toBeInTheDocument();
    expect(screen.getByText("Wood Fired")).toBeInTheDocument();
    expect(screen.getByText("Pizza")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("auto-advances to the next slide after SLIDE_DURATION", async () => {
    render(<HeroBanner />);
    expect(screen.getByText("Premium Steak")).toBeInTheDocument();

    // Auto-advance triggers goToSlide(1) which then waits text-fade + crossfade
    await act(async () => {
      vi.advanceTimersByTime(SLIDE_DURATION_MS + TEXT_FADE_MS + CROSSFADE_MS + 10);
    });

    // Slide 1 = "Grilled Salmon"
    expect(screen.getByText("Fresh From the Sea")).toBeInTheDocument();
    expect(screen.getByText("Grilled Salmon")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("the 'Order Now' link points to /menu", () => {
    render(<HeroBanner />);
    const orderLink = screen.getByRole("link", { name: /Order Now/ });
    expect(orderLink.getAttribute("href")).toBe("/menu");
  });

  it("the 'Learn More' link points to #about", () => {
    render(<HeroBanner />);
    const learnLink = screen.getByRole("link", { name: /Learn More/ });
    expect(learnLink.getAttribute("href")).toBe("#about");
  });
});
