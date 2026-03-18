import type { APIRoute } from "astro";
import { validateSession } from "../../lib/auth";
import { setSiteSetting } from "../../lib/db";

export const prerender = false;

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

  if (typeof data.blogName !== "string" || data.blogName.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: "blogName must be a non-empty string" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  await setSiteSetting("blogName", data.blogName.trim());

  if (typeof data.blogHeadline === "string") {
    await setSiteSetting("blogHeadline", data.blogHeadline.trim());
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
