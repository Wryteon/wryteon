import { describe, expect, it } from "vitest";
import { normalizeEditorJsListItems } from "./list";

describe("normalizeEditorJsListItems", () => {
  it("returns empty array for non-arrays", () => {
    expect(normalizeEditorJsListItems(null)).toEqual([]);
    expect(normalizeEditorJsListItems({})).toEqual([]);
    expect(normalizeEditorJsListItems("x")).toEqual([]);
  });

  it("supports legacy string items", () => {
    expect(normalizeEditorJsListItems(["one", "two"])).toEqual([
      { html: "one" },
      { html: "two" },
    ]);
  });

  it("supports object items with content", () => {
    expect(
      normalizeEditorJsListItems([
        { content: "A", meta: {}, items: [] },
        { content: "B" },
      ])
    ).toEqual([{ html: "A" }, { html: "B" }]);
  });

  it("extracts checklist checked state", () => {
    expect(
      normalizeEditorJsListItems([
        { content: "Task 1", meta: { checked: false } },
        { content: "Task 2", meta: { checked: true } },
      ])
    ).toEqual([
      { html: "Task 1", checked: false },
      { html: "Task 2", checked: true },
    ]);
  });

  it("drops non-object/non-string entries safely", () => {
    expect(normalizeEditorJsListItems(["ok", 123, null, undefined])).toEqual([
      { html: "ok" },
    ]);
  });
});
