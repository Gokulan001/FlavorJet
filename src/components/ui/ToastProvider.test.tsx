import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ToastProvider, { useToast } from "./ToastProvider";

function ToastTrigger({
  label,
  message,
  type,
}: {
  label: string;
  message: string;
  type?: "success" | "error" | "info";
}) {
  const { toast } = useToast();
  return <button onClick={() => toast(message, type)}>{label}</button>;
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("toast() renders a toast with the message visible", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="fire" message="hello world" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("fire"));
    expect(screen.getByText("hello world")).toBeInTheDocument();
  });

  it("multiple calls produce multiple stacked toasts", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="a" message="one" />
        <ToastTrigger label="b" message="two" />
        <ToastTrigger label="c" message="three" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("a"));
    await user.click(screen.getByText("b"));
    await user.click(screen.getByText("c"));
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("three")).toBeInTheDocument();
  });

  it("auto-dismisses each toast after 4000ms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="fire" message="ephemeral" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("fire"));
    expect(screen.getByText("ephemeral")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(4001);
    });

    expect(screen.queryByText("ephemeral")).not.toBeInTheDocument();
  });

  it("manual dismiss (× button) removes the toast immediately", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="fire" message="dismissible" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("fire"));

    const toastEl = screen.getByText("dismissible").closest("div")!;
    const dismissBtn = toastEl.querySelector("button") as HTMLButtonElement;
    await user.click(dismissBtn);

    expect(screen.queryByText("dismissible")).not.toBeInTheDocument();
  });

  it("success / error / info types render distinct icon variants", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="ok" message="success msg" type="success" />
        <ToastTrigger label="bad" message="error msg" type="error" />
        <ToastTrigger label="note" message="info msg" type="info" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("ok"));
    await user.click(screen.getByText("bad"));
    await user.click(screen.getByText("note"));

    const successCard = screen.getByText("success msg").closest("div")!;
    const errorCard = screen.getByText("error msg").closest("div")!;
    const infoCard = screen.getByText("info msg").closest("div")!;

    expect(successCard.className).toMatch(/bg-green-50/);
    expect(errorCard.className).toMatch(/bg-red-50/);
    expect(infoCard.className).toMatch(/bg-blue-50/);
  });

  it("default type is 'success' when omitted", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <ToastTrigger label="fire" message="default-type" />
      </ToastProvider>,
    );
    await user.click(screen.getByText("fire"));
    const card = screen.getByText("default-type").closest("div")!;
    expect(card.className).toMatch(/bg-green-50/);
  });

  it("useToast throws when used outside ToastProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ToastTrigger label="x" message="y" />)).toThrow(
      "useToast must be used within ToastProvider",
    );
    spy.mockRestore();
  });
});
