import { test, expect } from "@playwright/test";

test.describe("order-ai — signed-out smoke", () => {
  test("/order-ai while signed out is redirected to /login (middleware enforces auth)", async ({
    page,
  }) => {
    await page.goto("/order-ai");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login form is visible after the order-ai redirect", async ({ page }) => {
    await page.goto("/order-ai");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
