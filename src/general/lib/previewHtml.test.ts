import { describe, expect, it } from "vitest";
import { renderEditorJsBlocksToHtml } from "./previewHtml";

describe("renderEditorJsBlocksToHtml", () => {
  it("renders ordered list with object items", () => {
    const html = renderEditorJsBlocksToHtml([
      {
        type: "list",
        data: {
          style: "ordered",
          items: [{ content: "One" }, { content: "Two" }],
        },
      },
    ]);

    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
    expect(html).toContain("One");
    expect(html).toContain("Two");
  });

  it("renders checklist with disabled checkboxes", () => {
    const html = renderEditorJsBlocksToHtml([
      {
        type: "list",
        data: {
          style: "checklist",
          items: [
            { content: "A", meta: { checked: false } },
            { content: "B", meta: { checked: true } },
          ],
        },
      },
    ]);

    expect(html).toContain('<ul class="checklist">');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("disabled");
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("checked");
  });

  it("escapes code content", () => {
    const html = renderEditorJsBlocksToHtml([
      { type: "code", data: { code: "<script>alert(1)</script>" } },
    ]);

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
