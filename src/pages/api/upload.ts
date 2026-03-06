import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMediaUrl, getUploadsDir } from "../../lib/uploads";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof Blob) || file.size === 0) {
    return new Response(
      JSON.stringify({ success: 0, message: "No file provided" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const uploadsDir = getUploadsDir();
  await mkdir(uploadsDir, { recursive: true });

  const providedName = file instanceof File ? file.name : "";
  const extension =
    path.extname(providedName) ||
    `.${(file.type?.split("/")[1] ?? "bin").replace(/\W/g, "")}`;
  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(uploadsDir, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return new Response(
    JSON.stringify({
      success: 1,
      file: {
        url: getMediaUrl(filename),
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
};
