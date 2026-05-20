import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import OrderTimeline from "./OrderTimeline";

// All times in ms relative to a fixed base for deterministic tests
const BASE = new Date("2026-05-20T12:00:00Z").getTime();
const ETA_MINUTES = 30;
const ETA_MS = ETA_MINUTES * 60 * 1000;

function createdAt(minOffset = 0) {
  return new Date(BASE + minOffset).toISOString();
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(BASE);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OrderTimeline — initial render", () => {
  it("renders all four step labels (non-cancelled)", () => {
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    expect(screen.getByText("Order Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Preparing")).toBeInTheDocument();
    expect(screen.getByText("Ready for Pickup")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
  });

  it("renders the 'Order Status' heading", () => {
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    expect(screen.getByRole("heading", { name: "Order Status" })).toBeInTheDocument();
  });
});

describe("OrderTimeline — cancelled", () => {
  it("renders the red cancelled alert and no step labels", () => {
    render(
      <OrderTimeline
        status="cancelled"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    expect(screen.getByText(/This order has been cancelled/i)).toBeInTheDocument();
    expect(screen.queryByText("Order Confirmed")).not.toBeInTheDocument();
  });
});

describe("OrderTimeline — time-based status derivation", () => {
  it("at elapsed=0 only the first step is current ('In progress' under Order Confirmed)", () => {
    // Order created exactly at BASE; now = BASE → elapsed = 0
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    // The current step shows "In progress"
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("derives 'preparing' after ~50% of ETA", () => {
    vi.setSystemTime(BASE + ETA_MS * 0.5);
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );

    // The Preparing step should be the current (active) one
    const preparingLabel = screen.getByText("Preparing");
    // Sibling check: "In progress" appears under the current step
    expect(preparingLabel.parentElement?.textContent).toContain("In progress");
  });

  it("derives 'ready' after ~80% of ETA", () => {
    vi.setSystemTime(BASE + ETA_MS * 0.8);
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    const readyLabel = screen.getByText("Ready for Pickup");
    expect(readyLabel.parentElement?.textContent).toContain("In progress");
  });

  it("derives 'completed' after 100% of ETA — 'Delivered' label without 'In progress'", () => {
    vi.setSystemTime(BASE + ETA_MS + 1000);
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    // The "Delivered" subtitle appears under the last step
    const deliveredLabels = screen.getAllByText("Delivered");
    expect(deliveredLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });
});

describe("OrderTimeline — db-completed (skip timer)", () => {
  it("renders 'Delivered' immediately when status='completed' regardless of time", () => {
    render(
      <OrderTimeline
        status="completed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    const deliveredLabels = screen.getAllByText("Delivered");
    expect(deliveredLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });
});

describe("OrderTimeline — interval ticks", () => {
  it("re-derives state on each second when in-progress", () => {
    render(
      <OrderTimeline
        status="confirmed"
        estimatedMinutes={ETA_MINUTES}
        createdAt={createdAt(0)}
      />,
    );
    // Initial: confirmed step is current
    expect(screen.getByText("Order Confirmed").parentElement?.textContent).toContain(
      "In progress",
    );

    // Advance the wall clock past 25% of ETA → preparing
    act(() => {
      vi.setSystemTime(BASE + ETA_MS * 0.6);
      vi.advanceTimersByTime(1100);
    });

    const preparingLabel = screen.getByText("Preparing");
    expect(preparingLabel.parentElement?.textContent).toContain("In progress");
  });
});
