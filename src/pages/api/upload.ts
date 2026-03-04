import type { APIRoute } from "astro";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

const UPLOADS_DIR = path.resolve("./public/uploads");

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

  await mkdir(UPLOADS_DIR, { recursive: true });

  const providedName = file instanceof File ? file.name : "";
  const extension =
    path.extname(providedName) ||
    `.${(file.type?.split("/")[1] ?? "bin").replace(/\W/g, "")}`;
  const filename = `${randomUUID()}${extension}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return new Response(
    JSON.stringify({
      success: 1,
      file: {
        url: `/uploads/${filename}`,
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
};
