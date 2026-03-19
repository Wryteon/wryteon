import { test, expect, type Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it before running Playwright.`,
    );
  }
  return value.trim();
}

async function loginAsAdmin(page: Page, passwordOverride?: string) {
  const email = requireEnv("WRYTEON_ADMIN_EMAIL");
  const password = passwordOverride ?? requireEnv("WRYTEON_ADMIN_PASSWORD");

  await page.goto("/auth/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/admin(\/|$)/),
    page.locator('button[type="submit"]').click(),
  ]);
}

async function expectDefaultPasswordWarningVisible(page: Page) {
  await expect(page.locator("#password-warning")).toBeVisible();
  await expect(page.locator("#password-warning")).toContainText(
    "initial admin password",
  );
}

async function expectDefaultPasswordWarningHidden(page: Page) {
  await expect(page.locator("#password-warning")).toHaveCount(0);
}

function requireBaseUrl(): string {
  const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;
  if (typeof baseUrl === "string" && baseUrl.trim().length > 0) {
    return baseUrl.trim().replace(/\/$/, "");
  }

  const e2ePort = Number(process.env.E2E_PORT ?? 4517);
  return `http://127.0.0.1:${e2ePort}`;
}

test("login works with email", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(
    page.getByRole("heading", { name: "Welcome to Wryteon Admin" }),
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

  // Preview should open a dedicated SSR page (new tab)
  const [previewPage] = await Promise.all([
    page.context().waitForEvent("page"),
    page.locator("editor-component #preview-btn").click(),
  ]);

  await previewPage.waitForURL(/\/admin\/preview$/);
  await expect(previewPage.locator(".post-title")).toHaveText(title);
});

test("can upload an image and render it in a post", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());

  await loginAsAdmin(page);

  const baseUrl = requireBaseUrl();

  const slug = `e2e-image-${Date.now()}`;
  const title = `E2E Image ${slug}`;

  const uploadResponse = await page.request.post("/api/upload", {
    multipart: {
      image: {
        name: "hello.png",
        mimeType: "image/png",
        buffer: Buffer.from("hello"),
      },
    },
    headers: {
      Origin: baseUrl,
    },
  });

  expect(uploadResponse.ok()).toBe(true);
  const uploadPayload = await uploadResponse.json();
  const imageUrl = uploadPayload?.file?.url as string | undefined;
  expect(imageUrl).toMatch(/^\/media\//);

  const mediaResponse = await page.request.get(imageUrl ?? "");
  expect(mediaResponse.ok()).toBe(true);
  expect(mediaResponse.headers()["content-type"]).toContain("image/png");
  expect((await mediaResponse.body()).toString("utf-8")).toBe("hello");

  const saveResponse = await page.request.post(`/admin/${slug}`, {
    data: {
      id: slug,
      title,
      slug,
      status: "published",
      publishedAt: new Date().toISOString(),
      blocks: {
        blocks: [
          {
            type: "image",
            data: {
              file: { url: imageUrl },
              caption: "Uploaded via E2E",
            },
          },
        ],
      },
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(saveResponse.ok()).toBe(true);

  await page.goto(`/${slug}`);
  await expect(page.locator(".post-title")).toHaveText(title);
  await expect(page.locator(`img[src="${imageUrl}"]`)).toBeVisible();
});

test("shows the default password warning across admin pages", async ({
  page,
}) => {
  await loginAsAdmin(page);

  await page.goto("/admin");
  await expectDefaultPasswordWarningVisible(page);

  await page.goto("/admin/posts");
  await expectDefaultPasswordWarningVisible(page);

  await page.goto("/admin/new-post");
  await expectDefaultPasswordWarningVisible(page);

  await page.goto("/admin/settings");
  await expectDefaultPasswordWarningVisible(page);
});

test("hides the warning after changing the admin password", async ({
  page,
}) => {
  const currentPassword = requireEnv("WRYTEON_ADMIN_PASSWORD");
  const newPassword = `updated-${Date.now()}-password`;

  await loginAsAdmin(page, currentPassword);
  await page.goto("/admin/settings");

  await expectDefaultPasswordWarningVisible(page);

  await page.locator("#currentPassword").fill(currentPassword);
  await page.locator("#newPassword").fill(newPassword);
  await page.locator("#confirmPassword").fill(newPassword);

  await page.locator("#password-save-btn").click();

  await expect(page.locator("#password-status-msg")).toContainText(
    "Password changed successfully.",
  );
  await expectDefaultPasswordWarningHidden(page);

  await page.goto("/admin");
  await expectDefaultPasswordWarningHidden(page);

  await page.goto("/admin/posts");
  await expectDefaultPasswordWarningHidden(page);

  await page.goto("/admin/new-post");
  await expectDefaultPasswordWarningHidden(page);

  await page.goto("/admin/settings");
  await expectDefaultPasswordWarningHidden(page);
});
