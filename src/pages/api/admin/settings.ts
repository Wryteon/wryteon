import type { APIRoute } from "astro";
import { validateSession } from "../../../lib/auth";
import { setSiteSetting } from "../../../lib/db";
import {
  MAX_BLOG_HEADLINE_LENGTH,
  MAX_BLOG_NAME_LENGTH,
} from "../../../lib/siteSettings";

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

  if (typeof data.blogName !== "string") {
    return new Response(
      JSON.stringify({ error: "blogName must be a non-empty string" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const blogName = data.blogName.trim();
  if (blogName.length === 0 || blogName.length > MAX_BLOG_NAME_LENGTH) {
    return new Response(
      JSON.stringify({
        error: `blogName must be between 1 and ${MAX_BLOG_NAME_LENGTH} characters long`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let blogHeadline: string | undefined;

  if (typeof data.blogHeadline === "string") {
    blogHeadline = data.blogHeadline.trim();

    if (blogHeadline.length > MAX_BLOG_HEADLINE_LENGTH) {
      return new Response(
        JSON.stringify({
          error: `blogHeadline must be at most ${MAX_BLOG_HEADLINE_LENGTH} characters long`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  await setSiteSetting("blogName", blogName);

  if (blogHeadline !== undefined) {
    await setSiteSetting("blogHeadline", blogHeadline);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
