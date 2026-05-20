import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeProvider, { useTheme } from "./ThemeProvider";

function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  document.documentElement.className = "";
  localStorage.clear();
});

describe("ThemeProvider", () => {
  it("provides 'light' as the initial theme when <html> has no 'dark' class", () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");
  });

  it("syncs initial theme from <html class='dark'> on mount", () => {
    document.documentElement.classList.add("dark");
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("toggleTheme flips light → dark and updates the DOM + localStorage", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("light");

    await user.click(screen.getByText("toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("toggleTheme flips dark → light and removes the 'dark' class", async () => {
    document.documentElement.classList.add("dark");
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");

    await user.click(screen.getByText("toggle"));

    expect(screen.getByTestId("theme").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("re-renders consumers when theme changes", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );
    const themeEl = screen.getByTestId("theme");
    expect(themeEl.textContent).toBe("light");
    await user.click(screen.getByText("toggle"));
    expect(themeEl.textContent).toBe("dark");
    await user.click(screen.getByText("toggle"));
    expect(themeEl.textContent).toBe("light");
  });

  it("useTheme throws when used outside ThemeProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow(
      "useTheme must be used within ThemeProvider",
    );
    spy.mockRestore();
  });
});

import { vi } from "vitest";
