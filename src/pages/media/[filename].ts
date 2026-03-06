import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import {
  getContentType,
  getUploadFilePath,
  isSafeUploadFilename,
} from "../../lib/uploads";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;

  if (!filename || !isSafeUploadFilename(filename)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(getUploadFilePath(filename));

    return new Response(file, {
      headers: {
        "Content-Type": getContentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
};