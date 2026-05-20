import { test, expect } from "@playwright/test";

test.describe("profile — signed-out smoke", () => {
  test("/profile while signed out is redirected to /login (middleware enforces auth)", async ({
    page,
  }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login form is visible after the profile redirect", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
