import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    useInView: vi.fn(() => false),
    animate: vi.fn(
      (
        _from: number,
        to: number,
        opts: { onUpdate?: (value: number) => void },
      ) => {
        opts?.onUpdate?.(to);
        return { stop: () => {} };
      },
    ),
  };
});

import { useInView, animate } from "framer-motion";
const { default: AnimatedCounter } = await import("./AnimatedCounter");

const useInViewMock = vi.mocked(useInView);
const animateMock = vi.mocked(animate);

beforeEach(() => {
  useInViewMock.mockReset();
  animateMock.mockReset();
  useInViewMock.mockReturnValue(false);
  animateMock.mockImplementation((_from, to, opts) => {
    (opts as { onUpdate?: (v: number) => void })?.onUpdate?.(to as number);
    return { stop: () => {} } as ReturnType<typeof animate>;
  });
});

describe("AnimatedCounter", () => {
  it("renders '0' before useInView returns true", () => {
    useInViewMock.mockReturnValue(false);
    const { container } = render(<AnimatedCounter target={50} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("0");
    expect(animateMock).not.toHaveBeenCalled();
  });

  it("animates to the target value when useInView returns true", () => {
    useInViewMock.mockReturnValue(true);
    const { container } = render(<AnimatedCounter target={50} />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("50");
    expect(animateMock).toHaveBeenCalledTimes(1);
    expect(animateMock).toHaveBeenCalledWith(0, 50, expect.any(Object));
  });

  it("appends the suffix when provided", () => {
    useInViewMock.mockReturnValue(true);
    const { container } = render(<AnimatedCounter target={20} suffix="+" />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("20+");
  });

  it("renders '0' with suffix when not in view", () => {
    useInViewMock.mockReturnValue(false);
    const { container } = render(<AnimatedCounter target={20} suffix="%" />);
    const span = container.querySelector("span");
    expect(span?.textContent).toBe("0%");
  });

  it("does not re-animate when re-rendered after first animation (hasAnimated guard)", () => {
    useInViewMock.mockReturnValue(true);
    const { rerender } = render(<AnimatedCounter target={30} />);
    expect(animateMock).toHaveBeenCalledTimes(1);

    // Force re-render with the same in-view value
    rerender(<AnimatedCounter target={30} />);
    expect(animateMock).toHaveBeenCalledTimes(1);
  });

  it("passes the duration option to animate", () => {
    useInViewMock.mockReturnValue(true);
    render(<AnimatedCounter target={10} duration={3} />);
    const opts = animateMock.mock.calls[0][2] as { duration?: number };
    expect(opts.duration).toBe(3);
  });
});
