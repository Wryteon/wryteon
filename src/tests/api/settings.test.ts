import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_BLOG_HEADLINE_LENGTH,
  MAX_BLOG_NAME_LENGTH,
} from "../../lib/siteSettings";

const validateSession = vi.fn();
const setSiteSetting = vi.fn(async () => undefined);

vi.mock("../../lib/auth", () => ({
  validateSession,
}));

vi.mock("../../lib/db", () => ({
  setSiteSetting,
}));

type SettingsResponse = {
  success?: boolean;
  error?: string;
};

function createRequest(body: BodyInit | null, cookie = "session=valid-token") {
  const headers = new Headers();

  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (typeof body === "string") {
    headers.set("Content-Type", "application/json");
  }

  return new Request("http://localhost/api/settings", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  validateSession.mockReset();
  setSiteSetting.mockClear();
  validateSession.mockResolvedValue({ userId: "admin-1" });
});

describe("/api/settings", () => {
  it("returns 401 without a valid session", async () => {
    const { POST } = await import("../../pages/api/settings");

    validateSession.mockResolvedValue(null);

    const response = await POST({
      request: createRequest(JSON.stringify({ blogName: "Wryteon" })),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: "Unauthorized",
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest("{not-json"),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: "Invalid JSON",
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("returns 400 when blogName is not a string", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest(JSON.stringify({ blogName: 123 })),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: "blogName must be a non-empty string",
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("returns 400 when blogName is empty after trimming", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest(JSON.stringify({ blogName: "   " })),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: `blogName must be between 1 and ${MAX_BLOG_NAME_LENGTH} characters long`,
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("returns 400 when blogName exceeds the configured length", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          blogName: "a".repeat(MAX_BLOG_NAME_LENGTH + 1),
          blogHeadline: "Hello",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: `blogName must be between 1 and ${MAX_BLOG_NAME_LENGTH} characters long`,
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("returns 400 when blogHeadline exceeds the configured length", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          blogName: "Wryteon",
          blogHeadline: "a".repeat(MAX_BLOG_HEADLINE_LENGTH + 1),
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as SettingsResponse).toEqual({
      error: `blogHeadline must be at most ${MAX_BLOG_HEADLINE_LENGTH} characters long`,
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("stores trimmed blogName and blogHeadline on success", async () => {
    const { POST } = await import("../../pages/api/settings");

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          blogName: "  Wryteon Blog  ",
          blogHeadline: "  A better headline  ",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect((await response.json()) as SettingsResponse).toEqual({
      success: true,
    });
    expect(setSiteSetting).toHaveBeenNthCalledWith(1, "blogName", "Wryteon Blog");
    expect(setSiteSetting).toHaveBeenNthCalledWith(
      2,
      "blogHeadline",
      "A better headline",
    );
  });
});