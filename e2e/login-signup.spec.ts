import { test, expect, type Page } from "@playwright/test";

// NOTE: Happy-path signup is intentionally NOT covered here because:
//   1. The server-side Cloudinary SDK call cannot be intercepted by Playwright
//      (route mocks apply to the browser, not the Next.js server process).
//   2. The current .env.local has placeholder Cloudinary credentials.
// Server-action happy-path coverage lives in src/actions/auth-actions.test.ts.

function signinForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Sign in" }) });
}

function signupForm(page: Page) {
  return page
    .locator("form")
    .filter({ has: page.getByRole("heading", { name: "Sign up" }) });
}

// Panel toggle buttons sit OUTSIDE the forms. By DOM order, "Sign up" buttons are:
//   nth(0) = signup form submit button (inside the opacity-0 form initially)
//   nth(1) = desktop left-panel toggle (this is what we want)
// "Sign in" only appears once as a button (the right-panel toggle), since the signin
// form's submit button text is "Login".
function leftPanelSignupToggle(page: Page) {
  return page.getByRole("button", { name: "Sign up" }).nth(1);
}
function rightPanelSigninToggle(page: Page) {
  return page.getByRole("button", { name: "Sign in" });
}

test.describe("login/signup — UI flow", () => {
  test("defaults to sign-in mode on page load", async ({ page }) => {
    await page.goto("/login");
    await expect(signinForm(page)).toHaveClass(/opacity-100/);
    await expect(signupForm(page)).toHaveClass(/opacity-0/);
  });

  test("clicking the desktop 'Sign up' panel button switches to signup mode", async ({ page }) => {
    await page.goto("/login");
    await leftPanelSignupToggle(page).click();
    await expect(signupForm(page)).toHaveClass(/opacity-100/);
    await expect(signinForm(page)).toHaveClass(/opacity-0/);
  });

  test("clicking 'Sign in' panel button returns to signin mode", async ({ page }) => {
    await page.goto("/login");
    await leftPanelSignupToggle(page).click();
    await expect(signupForm(page)).toHaveClass(/opacity-100/);
    await rightPanelSigninToggle(page).click();
    await expect(signinForm(page)).toHaveClass(/opacity-100/);
  });
});

test.describe("login/signup — server action wiring", () => {
  test("submitting login with an unknown username shows the generic credentials error", async ({
    page,
  }) => {
    await page.goto("/login");

    await signinForm(page).getByPlaceholder("Username").fill(`ghost-${Date.now()}`);
    await signinForm(page).getByPlaceholder("Password").fill("wrong-password");
    await signinForm(page).getByRole("button", { name: "Login" }).click();

    await expect(page.getByText("Invalid username or password")).toBeVisible();
  });

  test("submitting signup with all empty fields shows the four validation errors", async ({
    page,
  }) => {
    await page.goto("/login");
    await leftPanelSignupToggle(page).click();
    await expect(signupForm(page)).toHaveClass(/opacity-100/);

    // The signup form's submit button is text "Sign up" inside the now-visible form
    await signupForm(page).getByRole("button", { name: "Sign up" }).click();

    await expect(page.getByText("Please fix these issues:")).toBeVisible();
    await expect(page.getByText("Username is required")).toBeVisible();
    await expect(page.getByText("Invalid email address")).toBeVisible();
    await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
    await expect(page.getByText("Profile picture is required")).toBeVisible();
  });
});
