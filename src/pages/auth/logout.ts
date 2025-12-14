import { deleteSession } from "../../lib/auth";

export async function GET(context: any) {
  const forwardedProto = context.request.headers.get("x-forwarded-proto");
  const requestUrl = new URL(context.request.url);
  const isSecure =
    requestUrl.protocol === "https:" || forwardedProto === "https";

  // Get session token from cookies
  const cookies = context.request.headers.get("cookie") || "";
  const sessionToken = cookies
    .split(";")
    .find((c: string) => c.trim().startsWith("session="))
    ?.split("=")[1];

  // Delete session if it exists
  if (sessionToken) {
    await deleteSession(sessionToken);
  }

  // Redirect to login and clear cookie
  const response = context.redirect("/auth/login");
  response.headers.set(
    "Set-Cookie",
    `session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecure ? "; Secure" : ""}`
  );

  return response;
}
