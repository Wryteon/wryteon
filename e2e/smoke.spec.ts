import { test, expect } from "@playwright/test";

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

async function loginAsAdmin(page) {
  const username = requireEnv("WRYTEON_ADMIN_USERNAME");
  const password = requireEnv("WRYTEON_ADMIN_PASSWORD");

  await page.goto("/auth/login");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(password);
  await Promise.all([
    page.waitForURL(/\/admin(\/|$)/),
    page.locator('button[type="submit"]').click(),
  ]);
}

test("login works", async ({ page }) => {
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
