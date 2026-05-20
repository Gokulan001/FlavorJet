import { test, expect } from "@playwright/test";

test.describe("checkout — signed-out smoke", () => {
  test("/checkout while signed out is redirected to /login (middleware enforces auth)", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login form is visible after the checkout redirect", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
