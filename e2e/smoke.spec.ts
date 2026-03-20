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

async function createPostViaApi(
  page: Page,
  options: {
    slug: string;
    title: string;
    status: "draft" | "published";
  },
) {
  const response = await page.request.post(`/admin/${options.slug}`, {
    data: {
      id: options.slug,
      title: options.title,
      slug: options.slug,
      status: options.status,
      publishedAt:
        options.status === "published" ? new Date().toISOString() : null,
      blocks: {
        blocks: [
          {
            type: "paragraph",
            data: {
              text: `${options.title} body`,
            },
          },
        ],
      },
    },
    headers: {
      "Content-Type": "application/json",
    },
  });

  expect(response.ok()).toBe(true);
}

async function getDashboardStatCount(page: Page, label: string) {
  const card = page.locator(".stat-card", { hasText: label }).first();
  const value = await card.locator(".stat-number").textContent();
  return Number(value ?? "0");
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
  await loginAsAdmin(page);

  const slug = `e2e-post-${Date.now()}`;
  const title = `E2E Post ${slug}`;

  await page.goto("/admin/new-post");

  await page.locator("#title-input").fill(title);
  await page.locator("#slug-input").fill(slug);
  await page.locator("#status-select").selectOption("published");

  await expect(page.locator("#editor-status")).toHaveCount(1);

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

test("dashboard stats reflect draft and published post totals", async ({
  page,
}) => {
  await loginAsAdmin(page);
  await page.goto("/admin");

  const initialTotal = await getDashboardStatCount(page, "Total Posts");
  const initialDrafts = await getDashboardStatCount(page, "Drafts");
  const initialPublished = await getDashboardStatCount(page, "Published");

  const draftSlug = `e2e-draft-${Date.now()}`;
  const publishedSlug = `e2e-published-${Date.now()}`;

  await createPostViaApi(page, {
    slug: draftSlug,
    title: `Draft ${draftSlug}`,
    status: "draft",
  });
  await createPostViaApi(page, {
    slug: publishedSlug,
    title: `Published ${publishedSlug}`,
    status: "published",
  });

  await page.goto("/admin");

  await expect.poll(() => getDashboardStatCount(page, "Total Posts")).toBe(
    initialTotal + 2,
  );
  await expect.poll(() => getDashboardStatCount(page, "Drafts")).toBe(
    initialDrafts + 1,
  );
  await expect.poll(() => getDashboardStatCount(page, "Published")).toBe(
    initialPublished + 1,
  );
});

test("admin navigation uses mobile tabs @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin");

  await expect(page.locator(".mobile-tabs")).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "New" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Posts" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Site" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign Out" })).toBeVisible();
});

test("mobile tabs navigate between admin pages @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin");

  await page.locator(".mobile-tabs").getByRole("link", { name: "Posts" }).click();
  await expect(page).toHaveURL(/\/admin\/posts$/);
  await expect(page.getByRole("heading", { name: "All Posts" })).toBeVisible();

  await page.locator(".mobile-tabs").getByRole("link", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\/admin\/settings$/);
  await expect(page.getByRole("heading", { name: "Site Settings" })).toBeVisible();

  await page.locator(".mobile-tabs").getByRole("link", { name: "New" }).click();
  await expect(page).toHaveURL(/\/admin\/new-post$/);
  await expect(page.locator("#title-input")).toBeVisible();
});

test("mobile editor saves draft with inline feedback @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  const slug = `e2e-mobile-draft-${Date.now()}`;
  const title = `Mobile Draft ${slug}`;

  await page.goto("/admin/new-post");
  await page.locator("#title-input").fill(title);
  await page.locator("#slug-input").fill(slug);
  await page.locator("#status-select").selectOption("draft");

  await page.locator("editor-component #save-btn").click();

  await expect(page.locator("#editor-status")).toContainText(
    "Post saved successfully.",
  );
  await expect(page).toHaveURL(/\/admin\/new-post$/);

  await page.goto("/admin/posts");
  await expect(page.locator("tbody tr", { hasText: title })).toBeVisible();
});

test("posts page shows actions on mobile @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  const slug = `e2e-mobile-${Date.now()}`;
  const title = `Mobile ${slug}`;

  await createPostViaApi(page, {
    slug,
    title,
    status: "draft",
  });

  await page.goto("/admin/posts");

  const row = page.locator("tbody tr", { hasText: title }).first();
  await expect(row).toBeVisible();
  await expect(row.getByRole("link", { name: "Edit" })).toBeVisible();
  await expect(row.getByRole("button", { name: "Delete" })).toBeVisible();
});

test("posts page can cancel delete on mobile @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  const slug = `e2e-cancel-delete-${Date.now()}`;
  const title = `Keep ${slug}`;

  await createPostViaApi(page, {
    slug,
    title,
    status: "draft",
  });

  await page.goto("/admin/posts");

  const row = page.locator("tbody tr", { hasText: title }).first();
  await row.getByRole("button", { name: "Delete" }).click();

  await expect(page.locator("#admin-confirm-overlay")).toBeVisible();
  await page.locator("#admin-confirm-cancel").click();

  await expect(page.locator("#admin-confirm-overlay")).toBeHidden();
  await expect(page.locator("tbody tr", { hasText: title })).toHaveCount(1);
});

test("settings form saves correctly on mobile @mobile", async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto("/admin/settings");

  const originalName = (await page.locator("#blogName").inputValue()).trim();
  const originalHeadline = (await page.locator("#blogHeadline").inputValue()).trim();
  const updatedName = `${originalName} Mobile`;
  const updatedHeadline = originalHeadline.length > 0
    ? `${originalHeadline} mobile`
    : "Mobile headline";

  await page.locator("#blogName").fill(updatedName);
  await page.locator("#blogHeadline").fill(updatedHeadline);
  await page.locator("#save-btn").click();

  await expect(page.locator("#status-msg")).toContainText(
    "Settings saved successfully!",
  );

  await page.reload();
  await expect(page.locator("#blogName")).toHaveValue(updatedName);
  await expect(page.locator("#blogHeadline")).toHaveValue(updatedHeadline);

  await page.locator("#blogName").fill(originalName);
  await page.locator("#blogHeadline").fill(originalHeadline);
  await page.locator("#save-btn").click();

  await expect(page.locator("#status-msg")).toContainText(
    "Settings saved successfully!",
  );
});

test("posts page deletes with custom confirmation UI", async ({ page }) => {
  await loginAsAdmin(page);

  const slug = `e2e-delete-${Date.now()}`;
  const title = `Delete ${slug}`;

  await createPostViaApi(page, {
    slug,
    title,
    status: "draft",
  });

  await page.goto("/admin/posts");

  const row = page.locator("tbody tr", { hasText: title }).first();
  await row.getByRole("button", { name: "Delete" }).click();

  await expect(page.locator("#admin-confirm-overlay")).toBeVisible();
  await expect(page.locator("#admin-confirm-title")).toHaveText("Delete post?");
  await expect(page.locator("#admin-confirm-message")).toContainText(
    "cannot undo this action",
  );

  await page.locator("#admin-confirm-accept").click();

  await expect(page.locator(".admin-toast")).toContainText("Post deleted");
  await expect(page.locator("tbody tr", { hasText: title })).toHaveCount(0);
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

  await page.locator("#currentPassword").fill(newPassword);
  await page.locator("#newPassword").fill(currentPassword);
  await page.locator("#confirmPassword").fill(currentPassword);

  await page.locator("#password-save-btn").click();

  await expect(page.locator("#password-status-msg")).toContainText(
    "Password changed successfully.",
  );

  await page.goto("/auth/logout");
  await loginAsAdmin(page, currentPassword);
});
