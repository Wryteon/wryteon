import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mocks for modules used by src/lib/db.ts ----

let selectResult: any[] = [];

const selectChain = {
  from: vi.fn(() => selectChain),
  where: vi.fn(() => selectChain),
  orderBy: vi.fn(async () => selectResult),
  limit: vi.fn(async () => selectResult),
};

const insertValues = vi.fn(async () => undefined);
const insertFn = vi.fn(() => ({ values: insertValues }));

const updateWhere = vi.fn(async () => undefined);
const updateSet = vi.fn(() => ({ where: updateWhere }));
const updateFn = vi.fn(() => ({ set: updateSet }));

const deleteWhere = vi.fn(async () => undefined);
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

vi.mock("astro:db", () => {
  return {
    db: {
      select: vi.fn(() => selectChain),
      insert: insertFn,
      update: updateFn,
      delete: deleteFn,
    },
    Posts: {
      id: "id",
      slug: "slug",
      status: "status",
      publishedAt: "publishedAt",
      updatedAt: "updatedAt",
      $inferSelect: {},
    },
    eq: (left: unknown, right: unknown) => ({ left, right }),
    desc: (value: unknown) => ({ desc: value }),
  };
});

beforeEach(() => {
  selectResult = [];

  selectChain.from.mockClear();
  selectChain.where.mockClear();
  selectChain.orderBy.mockClear();
  selectChain.limit.mockClear();

  insertFn.mockClear();
  insertValues.mockClear();

  updateFn.mockClear();
  updateSet.mockClear();
  updateWhere.mockClear();

  deleteFn.mockClear();
  deleteWhere.mockClear();
});

describe("db helpers", () => {
  it("savePost inserts when missing", async () => {
    const { savePost } = await import("./db");

    selectResult = [];

    await savePost({
      title: "Hello",
      slug: "hello",
      blocks: [],
      status: "published",
    });

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(updateFn).not.toHaveBeenCalled();

    const values = insertValues.mock.calls[0]?.[0];
    expect(values).toMatchObject({
      id: "hello",
      slug: "hello",
      title: "Hello",
      status: "published",
    });
    expect(values.publishedAt).toBeInstanceOf(Date);
    expect(values.createdAt).toBeInstanceOf(Date);
    expect(values.updatedAt).toBeInstanceOf(Date);
  });

  it("savePost sets publishedAt null for drafts", async () => {
    const { savePost } = await import("./db");

    selectResult = [];

    await savePost({
      title: "Draft",
      slug: "draft",
      blocks: [],
      status: "draft",
    });

    const values = insertValues.mock.calls[0]?.[0];
    expect(values.status).toBe("draft");
    expect(values.publishedAt).toBeNull();
  });

  it("savePost updates when existing", async () => {
    const { savePost } = await import("./db");

    selectResult = [{ id: "post-1" }];

    await savePost({
      id: "post-1",
      title: "Updated",
      slug: "updated",
      blocks: [{ type: "paragraph", data: { text: "hi" } }],
      status: "published",
    });

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(insertFn).not.toHaveBeenCalled();

    const setValues = updateSet.mock.calls[0]?.[0];
    expect(setValues).toMatchObject({
      title: "Updated",
      slug: "updated",
      status: "published",
    });
    expect(setValues.updatedAt).toBeInstanceOf(Date);
    expect(setValues.publishedAt).toBeInstanceOf(Date);
  });
});
