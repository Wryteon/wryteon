import { defineMiddleware } from "astro:middleware";
import { getRequestSession } from "./lib/auth";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  const isAdminPage = matchesPrefix(pathname, "/admin");
  const isAdminApi = matchesPrefix(pathname, "/api/admin");

  if (!isAdminPage && !isAdminApi) {
    return next();
  }

  const session = await getRequestSession(context.request);

  if (!session) {
    if (isAdminApi) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return context.redirect("/auth/login");
  }

  context.locals.session = session;
  return next();
});
