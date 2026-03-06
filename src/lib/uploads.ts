import path from "node:path";

const DEFAULT_UPLOADS_DIR = path.resolve("./data/uploads");
const FILENAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function getUploadsDir() {
  return process.env.UPLOADS_DIR || DEFAULT_UPLOADS_DIR;
}

export function getMediaUrl(filename: string) {
  return `/media/${filename}`;
}

export function isSafeUploadFilename(filename: string) {
  return FILENAME_PATTERN.test(filename);
}

export function getUploadFilePath(filename: string) {
  return path.join(getUploadsDir(), filename);
}

export function getContentType(filename: string) {
  switch (path.extname(filename).toLowerCase()) {
    case ".apng":
      return "image/apng";
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}