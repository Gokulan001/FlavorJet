import { test, expect } from "@playwright/test";

test.describe("orders — signed-out smoke", () => {
  test("/orders while signed out is redirected to /login (middleware enforces auth)", async ({
    page,
  }) => {
    await page.goto("/orders");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/orders/1 while signed out is redirected to /login", async ({ page }) => {
    await page.goto("/orders/1");
    await expect(page).toHaveURL(/\/login/);
  });
});
