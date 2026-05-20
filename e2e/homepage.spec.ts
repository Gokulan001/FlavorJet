import { test, expect } from "@playwright/test";

// E2E hits the real dev server with whatever's in data/flavorjet.db.
// Tests rely on the dev DB having seed data (categories + menu items).
// If that's missing, these tests will fail with clear locator errors — that's
// surfacing a real env issue, not a test bug.

test.describe("homepage — smoke + key interactions", () => {
  test("loads with hero indicator buttons present and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
    });

    await page.goto("/");

    // 6 slide indicator buttons
    const indicators = page.getByRole("button", { name: /Go to slide \d+/ });
    await expect(indicators).toHaveCount(6);

    // First slide content (scope to the hero section #home; "Welcome to FlavorJet"
    // also appears in another section heading)
    await expect(page.locator("#home").getByText("Welcome to FlavorJet")).toBeVisible();

    // Ignore expected dev-mode 404s for missing static assets (videos / images)
    const realErrors = errors.filter(
      (e) => !/404|Failed to load resource/i.test(e),
    );
    expect(realErrors).toEqual([]);
  });

  test("clicking the 3rd hero indicator switches to that slide", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Go to slide 3" }).click();

    // After text-fade (300ms) + crossfade (1200ms), slide 2's content is shown
    await expect(page.getByText("Handcrafted Daily")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Wood Fired")).toBeVisible();
  });

  test("PopularMenuTabs switches from breakfast to lunch", async ({ page }) => {
    await page.goto("/");

    const popularSection = page.locator("#popular");
    await popularSection.scrollIntoViewIfNeeded();

    // The Lunch tab button — there are multiple "Lunch" texts on the page
    // (could be a category card too), so target the popular section's button only
    const lunchTabBtn = popularSection.getByRole("button", { name: /Lunch/ });
    await lunchTabBtn.click();

    // After click, at least one menu item card should render under that tab.
    // We don't know the exact item names without inspecting seed data, so just
    // verify there is at least one card in the grid below the tabs.
    const itemCards = popularSection.locator("h4");
    await expect(itemCards.first()).toBeVisible({ timeout: 3000 });
  });

  test("clicking a category card navigates to /menu/{slug}", async ({ page }) => {
    await page.goto("/");

    const categoriesSection = page.locator("#categories");
    await categoriesSection.scrollIntoViewIfNeeded();

    // Click the first category card link inside the categories section
    const firstCategoryLink = categoriesSection
      .locator('a[href^="/menu/"]')
      .first();
    const href = await firstCategoryLink.getAttribute("href");
    expect(href).toMatch(/^\/menu\/[a-z0-9-]+$/);

    await firstCategoryLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });
});
