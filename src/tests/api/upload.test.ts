import { afterEach, describe, expect, it } from "vitest";
import { POST } from "../../pages/api/upload";
import path from "node:path";
import { readFile, unlink } from "node:fs/promises";

type UploadResponse = {
  success: number;
  file?: { url?: string };
  message?: string;
};

const createdFiles: string[] = [];

async function cleanupFiles() {
  while (createdFiles.length > 0) {
    const filePath = createdFiles.pop();
    if (!filePath) continue;
    try {
      await unlink(filePath);
    } catch {
      // ignore
    }
  }
}

afterEach(async () => {
  await cleanupFiles();
});

describe("/api/upload", () => {
  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();
    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(400);
    const payload = (await response.json()) as UploadResponse;
    expect(payload.success).toBe(0);
    expect(payload.message).toBe("No file provided");
  });

  it("uploads a file and returns its URL", async () => {
    const formData = new FormData();
    const file = new File([Buffer.from("hello")], "hello.png", {
      type: "image/png",
    });

    formData.set("image", file);

    const request = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as UploadResponse;
    expect(payload.success).toBe(1);
    expect(payload.file?.url).toMatch(/^\/uploads\//);

    const filename = payload.file?.url?.replace("/uploads/", "");
    expect(filename).toBeTruthy();

    const filePath = path.resolve("./public/uploads", filename ?? "");
    createdFiles.push(filePath);

    const written = await readFile(filePath, "utf-8");
    expect(written).toBe("hello");
  });
});
