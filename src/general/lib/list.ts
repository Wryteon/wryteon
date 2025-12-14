export type NormalizedListItem = {
  html: string;
  checked?: boolean;
};

type RawListItem =
  | string
  | {
      content?: unknown;
      meta?: unknown;
      items?: unknown;
    };

/**
 * Normalizes Editor.js List block items.
 *
 * Supports:
 * - legacy string items
 * - object items: { content, meta: { checked }, items }
 */
export function normalizeEditorJsListItems(raw: unknown): NormalizedListItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry): NormalizedListItem | null => {
      if (typeof entry === "string") {
        return { html: entry };
      }

      if (typeof entry !== "object" || entry === null) {
        return null;
      }

      const item = entry as RawListItem;
      const html =
        typeof (item as { content?: unknown }).content === "string"
          ? ((item as { content: string }).content ?? "")
          : "";

      const meta = (item as { meta?: unknown }).meta;
      const checked =
        typeof meta === "object" &&
        meta !== null &&
        typeof (meta as { checked?: unknown }).checked === "boolean"
          ? (meta as { checked: boolean }).checked
          : undefined;

      return { html, checked };
    })
    .filter((item): item is NormalizedListItem => item !== null);
}
