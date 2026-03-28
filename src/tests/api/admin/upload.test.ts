import { afterEach, describe, expect, it } from "vitest";
import { getUploadsDir } from "../../../lib/uploads";
import { APP_ROUTES, MEDIA_FILE_PREFIX } from "../../../lib/routes";
import { API_ROUTE_MODULES } from "./routes";
import path from "node:path";
import { mkdtemp, readFile, rm, unlink } from "node:fs/promises";
import os from "node:os";

type UploadResponse = {
  success: number;
  file?: { url?: string };
  message?: string;
};

const createdFiles: string[] = [];
let tempUploadsDir: string;

async function ensureUploadsDir() {
  if (!tempUploadsDir) {
    tempUploadsDir = await mkdtemp(path.join(os.tmpdir(), "wryteon-uploads-"));
    process.env.UPLOADS_DIR = tempUploadsDir;
  }
}

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
  if (tempUploadsDir) {
    await rm(tempUploadsDir, { recursive: true, force: true });
    tempUploadsDir = "";
  }
  delete process.env.UPLOADS_DIR;
});

async function loadUploadHandler() {
  return (await import(API_ROUTE_MODULES.upload)).POST;
}

async function loadMediaHandler() {
  return (await import(API_ROUTE_MODULES.media)).GET;
}

describe(APP_ROUTES.api.upload, () => {
  it("returns 400 when no file is provided", async () => {
    await ensureUploadsDir();
    const POST = await loadUploadHandler();
    const formData = new FormData();
    const request = new Request(`http://localhost${APP_ROUTES.api.upload}`, {
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
    await ensureUploadsDir();
    const POST = await loadUploadHandler();
    const formData = new FormData();
    const file = new File([Buffer.from("hello")], "hello.png", {
      type: "image/png",
    });

    formData.set("image", file);

    const request = new Request(`http://localhost${APP_ROUTES.api.upload}`, {
      method: "POST",
      body: formData,
    });

    const response = await POST({ request } as Parameters<typeof POST>[0]);

    expect(response.status).toBe(200);
    const payload = (await response.json()) as UploadResponse;
    expect(payload.success).toBe(1);
    expect(payload.file?.url).toMatch(new RegExp(`^${MEDIA_FILE_PREFIX}`));

    const filename = payload.file?.url?.replace(MEDIA_FILE_PREFIX, "");
    expect(filename).toBeTruthy();

    const filePath = path.join(getUploadsDir(), filename ?? "");
    createdFiles.push(filePath);

    const written = await readFile(filePath, "utf-8");
    expect(written).toBe("hello");
  });

  it("serves an uploaded file through the media route", async () => {
    await ensureUploadsDir();
    const POST = await loadUploadHandler();
    const getMedia = await loadMediaHandler();
    const formData = new FormData();
    const file = new File([Buffer.from("hello")], "hello.png", {
      type: "image/png",
    });

    formData.set("image", file);

    const uploadRequest = new Request(
      `http://localhost${APP_ROUTES.api.upload}`,
      {
        method: "POST",
        body: formData,
      },
    );

    const uploadResponse = await POST({
      request: uploadRequest,
    } as Parameters<typeof POST>[0]);
    const payload = (await uploadResponse.json()) as UploadResponse;
    const filename = payload.file?.url?.replace(MEDIA_FILE_PREFIX, "");

    expect(filename).toBeTruthy();

    const filePath = path.join(getUploadsDir(), filename ?? "");
    createdFiles.push(filePath);

    const mediaResponse = await getMedia({
      params: { filename },
    } as Parameters<typeof getMedia>[0]);

    expect(mediaResponse.status).toBe(200);
    expect(mediaResponse.headers.get("Content-Type")).toBe("image/png");
    expect(await mediaResponse.text()).toBe("hello");
  });
});
