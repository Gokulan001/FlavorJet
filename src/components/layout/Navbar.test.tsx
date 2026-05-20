import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => import("@/test/mocks/next-image"));
vi.mock("next/link", () => import("@/test/mocks/next-link"));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("@/actions/auth-actions", () => ({
  logout: vi.fn(async () => undefined),
}));

const toggleThemeMock = vi.fn();
vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: toggleThemeMock }),
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const scrollListeners: ((latest: number) => void)[] = [];
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useScroll: () => ({ scrollY: { get: () => 0 } }),
    useMotionValueEvent: (
      _value: unknown,
      _event: string,
      cb: (latest: number) => void,
    ) => {
      scrollListeners.push(cb);
    },
  };
});

import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth-actions";
const { default: Navbar } = await import("./Navbar");

const usePathnameMock = vi.mocked(usePathname);
const logoutMock = vi.mocked(logout);

const signedIn = { username: "logan", profilePicture: "/avatar.jpg" };

beforeEach(() => {
  usePathnameMock.mockReturnValue("/");
  logoutMock.mockClear();
  toggleThemeMock.mockClear();
  scrollListeners.length = 0;
});

describe("Navbar — unauthenticated", () => {
  it("renders the 'Sign In' link with href /login", () => {
    render(<Navbar user={null} cartCount={0} />);
    const signIn = screen
      .getAllByRole("link", { name: "Sign In" })
      .find((el) => el.getAttribute("href") === "/login");
    expect(signIn).toBeDefined();
  });

  it("does not render the profile link or logout button", () => {
    render(<Navbar user={null} cartCount={0} />);
    expect(
      screen.queryByRole("link", { name: /profile/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("does not render the cart badge when cartCount is 0", () => {
    const { container } = render(<Navbar user={null} cartCount={0} />);
    // Badge is a sibling span inside the /cart link. Locate the cart link and check it has no badge.
    const cartLink = Array.from(container.querySelectorAll('a[href="/cart"]'))[0];
    expect(cartLink.textContent?.trim()).toBe("Cart");
  });
});

describe("Navbar — authenticated", () => {
  it("renders the profile link with href /profile", () => {
    render(<Navbar user={signedIn} cartCount={0} />);
    const profileLinks = screen.getAllByRole("link").filter((l) => l.getAttribute("href") === "/profile");
    expect(profileLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the logout button with aria-label 'Sign out'", () => {
    render(<Navbar user={signedIn} cartCount={0} />);
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("renders the avatar image with the user's profile picture", () => {
    render(<Navbar user={signedIn} cartCount={0} />);
    const img = screen.getByAltText("Profile") as HTMLImageElement;
    expect(img.src).toContain("/avatar.jpg");
  });

  it("falls back to the User icon when profilePicture is null", () => {
    render(<Navbar user={{ username: "logan", profilePicture: null }} cartCount={0} />);
    expect(screen.queryByAltText("Profile")).not.toBeInTheDocument();
  });

  it("does NOT render the Sign In link", () => {
    render(<Navbar user={signedIn} cartCount={0} />);
    const links = screen.queryAllByRole("link", { name: "Sign In" });
    expect(links).toHaveLength(0);
  });
});

describe("Navbar — cart badge", () => {
  it("shows the cart badge with the count when cartCount > 0", () => {
    render(<Navbar user={signedIn} cartCount={3} />);
    // Badge contains the number — there's both a desktop and mobile badge in DOM
    const badges = screen.getAllByText("3");
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it("hides the cart badge when cartCount is 0", () => {
    render(<Navbar user={signedIn} cartCount={0} />);
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("updates the badge when cartCount changes via re-render", () => {
    const { rerender } = render(<Navbar user={signedIn} cartCount={1} />);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);

    rerender(<Navbar user={signedIn} cartCount={5} />);
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});

describe("Navbar — mobile menu", () => {
  it("is closed by default (no mobile-menu links visible)", () => {
    const { container } = render(<Navbar user={null} cartCount={0} />);
    // Mobile-menu dropdown only exists when open
    expect(container.textContent).not.toContain("AI Assistant");
  });

  it("opens when the mobile menu button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar user={null} cartCount={0} />);

    // Mobile menu button is the only non-aria-labeled icon button visible at the right edge.
    // We grab the button whose icon is the Menu (or X). Easier: find all buttons in the nav,
    // pick the one whose textContent is empty and is rendered last among the visible <button>s.
    const buttons = screen.getAllByRole("button");
    const menuBtn = buttons.find(
      (b) => !b.getAttribute("aria-label") && b.querySelector("svg"),
    );
    expect(menuBtn).toBeDefined();
    await user.click(menuBtn!);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("closes when the route changes (pathname dep in useEffect)", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Navbar user={null} cartCount={0} />);

    const buttons = screen.getAllByRole("button");
    const menuBtn = buttons.find(
      (b) => !b.getAttribute("aria-label") && b.querySelector("svg"),
    )!;
    await user.click(menuBtn);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();

    // Simulate route change
    usePathnameMock.mockReturnValue("/menu");
    rerender(<Navbar user={null} cartCount={0} />);

    await waitFor(() => {
      expect(screen.queryByText("AI Assistant")).not.toBeInTheDocument();
    });
  });
});

describe("Navbar — logout modal", () => {
  it("opens when the desktop logout button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar user={signedIn} cartCount={0} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yes, Sign Out/ })).toBeInTheDocument();
  });

  it("Cancel closes the modal without calling logout", async () => {
    const user = userEvent.setup();
    render(<Navbar user={signedIn} cartCount={0} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Confirm Sign Out")).not.toBeInTheDocument();
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("Confirm calls the logout server action", async () => {
    const user = userEvent.setup();
    render(<Navbar user={signedIn} cartCount={0} />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await user.click(screen.getByRole("button", { name: /Yes, Sign Out/ }));

    await waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });
});

describe("Navbar — theme button", () => {
  it("calls toggleTheme when the theme button is clicked", async () => {
    const user = userEvent.setup();
    render(<Navbar user={null} cartCount={0} />);
    await user.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(toggleThemeMock).toHaveBeenCalledTimes(1);
  });
});

describe("Navbar — search + AI links", () => {
  it("Search link points to /menu/search", () => {
    render(<Navbar user={null} cartCount={0} />);
    const search = screen.getByRole("link", { name: "Search" });
    expect(search.getAttribute("href")).toBe("/menu/search");
  });

  it("AI link points to /order-ai", () => {
    render(<Navbar user={null} cartCount={0} />);
    const ai = screen.getByRole("link", { name: "AI Assistant" });
    expect(ai.getAttribute("href")).toBe("/order-ai");
  });
});

describe("Navbar — route-aware pill style", () => {
  it("uses pill style on /order-ai regardless of scroll", () => {
    usePathnameMock.mockReturnValue("/order-ai");
    const { container } = render(<Navbar user={null} cartCount={0} />);
    // The "pill" class signature is rounded-full + max-w-3xl on the inner container
    expect(container.innerHTML).toMatch(/max-w-3xl/);
  });

  it("uses pill style on non-overlay pages (e.g., /menu)", () => {
    usePathnameMock.mockReturnValue("/menu");
    const { container } = render(<Navbar user={null} cartCount={0} />);
    expect(container.innerHTML).toMatch(/max-w-3xl/);
  });

  it("uses flat style on home (/) when not scrolled", () => {
    usePathnameMock.mockReturnValue("/");
    const { container } = render(<Navbar user={null} cartCount={0} />);
    expect(container.innerHTML).toMatch(/max-w-7xl/);
    expect(container.innerHTML).not.toMatch(/max-w-3xl/);
  });

  it("switches to pill style on home when scrolled past 50px", async () => {
    usePathnameMock.mockReturnValue("/");
    const { container } = render(<Navbar user={null} cartCount={0} />);
    expect(container.innerHTML).toMatch(/max-w-7xl/);

    // Trigger the captured scroll callback past the threshold
    await act(async () => {
      scrollListeners.forEach((cb) => cb(100));
    });

    expect(container.innerHTML).toMatch(/max-w-3xl/);
  });
});
