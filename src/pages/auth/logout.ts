import { deleteSession, getSessionTokenFromRequest } from "../../lib/auth";

export async function GET(context: any) {
  const forwardedProto = context.request.headers.get("x-forwarded-proto");
  const requestUrl = new URL(context.request.url);
  const isSecure =
    requestUrl.protocol === "https:" || forwardedProto === "https";

  const sessionToken = getSessionTokenFromRequest(context.request);

  // Delete session if it exists
  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  // Redirect to login and clear cookie
  const response = context.redirect("/auth/login");
  response.headers.set(
    "Set-Cookie",
    `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`,
  );

  return response;
}
