import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/actions/cart-actions", () => ({
  reorderFromOrder: vi.fn(),
}));

import { reorderFromOrder } from "@/actions/cart-actions";
const { default: ReorderButton } = await import("./ReorderButton");
const reorderMock = vi.mocked(reorderFromOrder);

beforeEach(() => {
  reorderMock.mockReset();
  reorderMock.mockResolvedValue(undefined as never);
});

describe("ReorderButton", () => {
  it("renders 'Reorder' with refresh icon in idle state", () => {
    render(<ReorderButton orderId={42} />);
    expect(screen.getByRole("button", { name: /Reorder/i })).toBeInTheDocument();
  });

  it("clicking calls reorderFromOrder with the orderId", async () => {
    const user = userEvent.setup();
    render(<ReorderButton orderId={42} />);
    await user.click(screen.getByRole("button"));
    await waitFor(() => expect(reorderMock).toHaveBeenCalledWith(42));
  });

  it("button is disabled and shows 'Adding to Cart...' while pending", async () => {
    let resolveAction: (() => void) | null = null;
    reorderMock.mockReturnValue(
      new Promise<undefined>((res) => {
        resolveAction = () => res(undefined);
      }) as never,
    );

    const user = userEvent.setup();
    render(<ReorderButton orderId={1} />);
    await user.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Adding to Cart/i })).toBeDisabled(),
    );

    resolveAction?.();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^Reorder$/i })).not.toBeDisabled(),
    );
  });
});
