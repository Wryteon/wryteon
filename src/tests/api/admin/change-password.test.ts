import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTES } from "../../../lib/routes";
import { API_ROUTE_MODULES } from "./routes";

const validateSession = vi.fn();
const changeUserPassword = vi.fn();
const setSiteSetting = vi.fn(async () => undefined);

vi.mock("../../../lib/auth", () => ({
  validateSession,
  changeUserPassword,
  MIN_PASSWORD_LENGTH: 8,
}));

vi.mock("../../../lib/db", () => ({
  setSiteSetting,
}));

type PasswordResponse = {
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

  return new Request(`http://localhost${APP_ROUTES.api.changePassword}`, {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  validateSession.mockReset();
  changeUserPassword.mockReset();
  setSiteSetting.mockClear();

  validateSession.mockResolvedValue({ userId: "admin-1" });
  changeUserPassword.mockResolvedValue({ success: true });
});

describe(APP_ROUTES.api.changePassword, () => {
  it("returns 401 without a valid session", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    validateSession.mockResolvedValue(null);

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          currentPassword: "old-password",
          newPassword: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(401);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "Unauthorized",
    });
    expect(changeUserPassword).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    const response = await POST({
      request: createRequest("{invalid-json"),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "Invalid JSON",
    });
    expect(changeUserPassword).not.toHaveBeenCalled();
  });

  it("returns 400 for missing password fields", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    const response = await POST({
      request: createRequest(
        JSON.stringify({ currentPassword: "old-password" }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "currentPassword, newPassword, and confirmPassword are required",
    });
    expect(changeUserPassword).not.toHaveBeenCalled();
  });

  it("returns 400 when new password and confirmation differ", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          currentPassword: "old-password",
          newPassword: "new-password-123",
          confirmPassword: "different-password",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "New password and confirmation do not match",
    });
    expect(changeUserPassword).not.toHaveBeenCalled();
  });

  it("returns 400 when new password equals current password", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          currentPassword: "same-password",
          newPassword: "same-password",
          confirmPassword: "same-password",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "New password must be different from current password",
    });
    expect(changeUserPassword).not.toHaveBeenCalled();
  });

  it("returns 400 when password update fails", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    changeUserPassword.mockResolvedValue({
      success: false,
      error: "Current password is incorrect",
    });

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          currentPassword: "wrong-password",
          newPassword: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    expect((await response.json()) as PasswordResponse).toEqual({
      error: "Current password is incorrect",
    });
    expect(setSiteSetting).not.toHaveBeenCalled();
  });

  it("stores password-changed flag on success", async () => {
    const { POST } = await import(API_ROUTE_MODULES.changePassword);

    const response = await POST({
      request: createRequest(
        JSON.stringify({
          currentPassword: "old-password",
          newPassword: "new-password-123",
          confirmPassword: "new-password-123",
        }),
      ),
    } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    expect((await response.json()) as PasswordResponse).toEqual({
      success: true,
    });
    expect(changeUserPassword).toHaveBeenCalledWith(
      "admin-1",
      "old-password",
      "new-password-123",
    );
    expect(setSiteSetting).toHaveBeenCalledWith(
      "defaultAdminPasswordChanged",
      "true",
    );
  });
});
