import { test, expect } from "@playwright/test";

test.describe("menu — smoke + key flows", () => {
  test("/menu lists category cards linking to /menu/{slug}", async ({ page }) => {
    await page.goto("/menu");

    // Heading present
    await expect(page.getByRole("heading", { name: /Our/i }).first()).toBeVisible();

    // At least one category card linking to /menu/<slug>
    const categoryLinks = page.locator("a[href^='/menu/']").filter({
      hasText: /items/,
    });
    await expect(categoryLinks.first()).toBeVisible();
  });

  test("clicking a category card navigates to its /menu/{slug} page", async ({ page }) => {
    await page.goto("/menu");
    const firstCategoryLink = page
      .locator("a[href^='/menu/']")
      .filter({ hasText: /items/ })
      .first();
    const href = await firstCategoryLink.getAttribute("href");
    await firstCategoryLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace(/\//g, "\\/")));
  });

  test("search page filters results by ?q=", async ({ page }) => {
    await page.goto("/menu/search");
    // baseline header
    await expect(page.getByRole("heading", { name: /Explore Menu/ })).toBeVisible();

    // Apply a query that's unlikely to match: shows the empty-state banner
    await page.goto("/menu/search?q=zzzzz-no-match");
    await expect(page.getByText(/No dishes match your filters/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Clear All Filters/i })).toBeVisible();
  });

  test("Quick Add on a no-modifier item redirects an unauthenticated user to /login", async ({
    page,
  }) => {
    await page.goto("/menu/search");
    // Find a "Add" button (QuickAddButton on items without modifiers).
    // If the seed has no such items, this test is skipped via expect.soft fallback.
    const addBtn = page.getByRole("button", { name: /^Add$/ }).first();
    const count = await addBtn.count();
    test.skip(count === 0, "No no-modifier items visible in current seed");

    await addBtn.click();
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });
});
