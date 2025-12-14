import { test, expect } from "@playwright/test";

async function loginAsAdmin(page) {
  await page.goto("/auth/login");
  await page.locator('input[name="username"]').fill("admin");
  await page.locator('input[name="password"]').fill("admin123");
  await Promise.all([
    page.waitForURL(/\/admin(\/|$)/),
    page.locator('button[type="submit"]').click(),
  ]);
}

test("login works", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(
    page.getByRole("heading", { name: "Welcome to Wryteon Admin" })
  ).toBeVisible();
});

test("can create and view a published post", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await loginAsAdmin(page);

  const slug = `e2e-post-${Date.now()}`;
  const title = `E2E Post ${slug}`;

  await page.goto("/admin/new-post");

  await page.locator("#title-input").fill(title);
  await page.locator("#slug-input").fill(slug);
  await page.locator("#status-select").selectOption("published");

  await Promise.all([
    page.waitForURL(new RegExp(`/${slug}$`)),
    page.locator("editor-component #save-btn").click(),
  ]);

  await expect(page.locator(".post-title")).toHaveText(title);

  // Basic navigation back into admin edit page
  await page.locator('a.edit-link[href^="/admin/"]').click();
  await expect(page.locator("#title-input")).toHaveValue(title);
});
