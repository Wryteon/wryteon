import type { APIRoute } from "astro";
import { changeUserPassword, validateSession } from "../../../lib/auth";
import { setSiteSetting } from "../../../lib/db";

export const prerender = false;

const INITIAL_PASSWORD_CHANGED_KEY = "defaultAdminPasswordChanged";

export const POST: APIRoute = async ({ request }) => {
  const cookies = request.headers.get("cookie") || "";
  const sessionToken = cookies
    .split(";")
    .find((c) => c.trim().startsWith("session="))
    ?.split("=")[1];

  const session = sessionToken ? await validateSession(sessionToken) : null;
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (
    typeof data.currentPassword !== "string" ||
    typeof data.newPassword !== "string" ||
    typeof data.confirmPassword !== "string"
  ) {
    return new Response(
      JSON.stringify({
        error: "currentPassword, newPassword, and confirmPassword are required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const currentPassword = data.currentPassword.trim();
  const newPassword = data.newPassword.trim();
  const confirmPassword = data.confirmPassword.trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return new Response(
      JSON.stringify({ error: "All password fields are required" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (newPassword !== confirmPassword) {
    return new Response(
      JSON.stringify({ error: "New password and confirmation do not match" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  if (newPassword === currentPassword) {
    return new Response(
      JSON.stringify({
        error: "New password must be different from current password",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const result = await changeUserPassword(
    session.userId,
    currentPassword,
    newPassword,
  );

  if (!result.success) {
    return new Response(
      JSON.stringify({ error: result.error ?? "Failed to change password" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  await setSiteSetting(INITIAL_PASSWORD_CHANGED_KEY, "true");

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
