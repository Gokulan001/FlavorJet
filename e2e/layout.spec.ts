import { test, expect } from "@playwright/test";

test.describe("layout shell — smoke", () => {
  test("homepage renders navbar, footer, and floating AI button", async ({ page }) => {
    await page.goto("/");

    // Navbar (logo link to /)
    await expect(page.locator("a[href='/']").first()).toBeVisible();

    // Footer (look for stable static text — 'Contact' or 'Hours' or 'Values')
    await expect(page.locator("footer")).toBeVisible();

    // AI floating button (aria-label set in component)
    await expect(page.getByRole("link", { name: "Order with AI" })).toBeVisible();
  });

  test("top-nav links have the expected hrefs", async ({ page }) => {
    await page.goto("/");

    // Desktop nav links live in the main nav; pick the first match per href
    const home = page.locator("nav a[href='/']").first();
    const menu = page.locator("nav a[href='/menu']").first();
    const cart = page.locator("nav a[href='/cart']").first();
    const orders = page.locator("nav a[href='/orders']").first();
    const signIn = page.locator("nav a[href='/login']").first();
    const search = page.locator("nav a[href='/menu/search']").first();
    const ai = page.locator("nav a[href='/order-ai']").first();

    await expect(home).toHaveCount(1);
    await expect(menu).toHaveCount(1);
    await expect(cart).toHaveCount(1);
    await expect(orders).toHaveCount(1);
    await expect(signIn).toHaveCount(1);
    await expect(search).toHaveCount(1);
    await expect(ai).toHaveCount(1);
  });

  test("theme toggle button is present and clickable", async ({ page }) => {
    await page.goto("/");

    const themeBtn = page.getByRole("button", { name: "Toggle theme" });
    await expect(themeBtn).toBeVisible();

    // Click doesn't throw — we don't assert persistence (browser-implementation territory)
    await themeBtn.click();
    await themeBtn.click(); // toggle back
  });

  test("AI floating button is hidden on /order-ai", async ({ page }) => {
    await page.goto("/order-ai");
    // The link still exists in the DOM but has opacity-0 + pointer-events-none
    const aiBtn = page.getByRole("link", { name: "Order with AI" });
    await expect(aiBtn).toHaveClass(/opacity-0/);
  });
});
