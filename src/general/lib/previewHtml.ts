import { normalizeEditorJsListItems } from "./list";

export type EditorJsBlock = {
  type?: unknown;
  data?: unknown;
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Client-side HTML renderer for Editor.js blocks.
 *
 * This is intended for the admin preview modal (browser), not the public pages.
 * Public pages use Astro components for SSR/SEO.
 */
export function renderEditorJsBlocksToHtml(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";

  return (blocks as EditorJsBlock[])
    .map((block) => {
      const type = asString(block?.type);
      const data =
        typeof block?.data === "object" && block.data !== null
          ? (block.data as Record<string, unknown>)
          : {};

      switch (type) {
        case "header": {
          const level = Math.min(Math.max(asNumber(data.level, 2), 1), 6);
          // Editor.js stores HTML strings for text blocks; keep as-is.
          const text = asString(data.text);
          return `<h${level}>${text}</h${level}>`;
        }
        case "paragraph": {
          const text = asString(data.text);
          return `<p>${text}</p>`;
        }
        case "list": {
          const style = asString(data.style) || "unordered";
          const isChecklist = style === "checklist";
          const listType = style === "ordered" ? "ol" : "ul";

          const normalized = normalizeEditorJsListItems(data.items);
          const itemsHtml = normalized
            .map((item) => {
              const checkbox = isChecklist
                ? `<input class="check" type="checkbox" disabled ${item.checked ? "checked" : ""} />`
                : "";
              return `<li>${checkbox}<span>${item.html}</span></li>`;
            })
            .join("");

          const tag = isChecklist ? "ul" : listType;
          const classAttr = isChecklist ? ' class="checklist"' : "";
          return `<${tag}${classAttr}>${itemsHtml}</${tag}>`;
        }
        case "code": {
          const code = asString(data.code);
          return `<pre><code>${escapeHtml(code)}</code></pre>`;
        }
        case "quote": {
          const text = asString(data.text);
          const caption = asString(data.caption);
          const footer = caption ? `<footer>${caption}</footer>` : "";
          return `<blockquote>${text}${footer}</blockquote>`;
        }
        case "image": {
          const file =
            typeof data.file === "object" && data.file !== null
              ? (data.file as Record<string, unknown>)
              : {};
          const url = asString(file.url);
          const caption = asString(data.caption);
          const alt = caption ? escapeHtml(caption) : "";
          return `<figure><img src="${escapeHtml(url)}" alt="${alt}"><figcaption>${escapeHtml(caption)}</figcaption></figure>`;
        }
        case "delimiter":
          return "<hr>";
        default:
          return "";
      }
    })
    .join("");
}
