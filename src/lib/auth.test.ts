import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Mocks for modules used by src/lib/auth.ts ----

let selectResult: any[] = [];

const selectChain = {
  from: vi.fn(() => selectChain),
  where: vi.fn(() => selectChain),
  limit: vi.fn(async () => selectResult),
};

const insertValues = vi.fn(async () => undefined);
const insertFn = vi.fn(() => ({ values: insertValues }));

const deleteWhere = vi.fn(async () => undefined);
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

vi.mock("astro:db", () => {
  return {
    db: {
      select: vi.fn(() => selectChain),
      insert: insertFn,
      delete: deleteFn,
    },
    eq: (left: unknown, right: unknown) => ({ left, right }),
  };
});

vi.mock("@astrojs/db/utils", () => {
  return {
    asDrizzleTable: (_name: string, table: Record<string, unknown>) => table,
  };
});

vi.mock("../../db/config", () => {
  return {
    Users: {
      id: "id",
      email: "email",
      passwordHash: "passwordHash",
      createdAt: "createdAt",
    },
    Sessions: {
      id: "id",
      userId: "userId",
      token: "token",
      expiresAt: "expiresAt",
      createdAt: "createdAt",
    },
  };
});

beforeEach(() => {
  selectResult = [];

  selectChain.from.mockClear();
  selectChain.where.mockClear();
  selectChain.limit.mockClear();

  insertFn.mockClear();
  insertValues.mockClear();

  deleteFn.mockClear();
  deleteWhere.mockClear();
});

describe("auth", () => {
  it("hashPassword + verifyPassword roundtrip", async () => {
    const { hashPassword, verifyPassword } = await import("./auth");

    const password = "correct horse battery staple";
    const hash = await hashPassword(password);

    expect(hash).not.toEqual(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("createSession inserts session and returns token", async () => {
    const { createSession } = await import("./auth");

    const token = await createSession("user-123");

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);

    const payload = insertValues.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      userId: "user-123",
      token,
    });
    expect(payload.expiresAt).toBeInstanceOf(Date);
  });

  it("validateSession returns null when missing", async () => {
    const { validateSession } = await import("./auth");

    selectResult = [];
    const result = await validateSession("tok");

    expect(result).toBeNull();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("validateSession deletes expired sessions", async () => {
    const { validateSession } = await import("./auth");

    selectResult = [
      {
        id: "sess-1",
        userId: "user-1",
        token: "tok",
        expiresAt: new Date(Date.now() - 60_000),
      },
    ];

    const result = await validateSession("tok");

    expect(result).toBeNull();
    expect(deleteFn).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
  });

  it("validateSession returns userId when valid", async () => {
    const { validateSession } = await import("./auth");

    selectResult = [
      {
        id: "sess-2",
        userId: "user-2",
        token: "tok2",
        expiresAt: new Date(Date.now() + 60_000),
      },
    ];

    const result = await validateSession("tok2");

    expect(result).toEqual({ userId: "user-2" });
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it("createUser inserts an email-only user", async () => {
    const { createUser } = await import("./auth");

    const user = await createUser("admin@example.com", "secret-password");

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);

    const payload = insertValues.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      email: "admin@example.com",
    });
    expect(payload.passwordHash).toEqual(expect.any(String));
    expect(payload.createdAt).toBeInstanceOf(Date);
    expect(user).toMatchObject({
      id: expect.any(String),
      email: "admin@example.com",
    });
  });

  it("verifyLogin authenticates with email", async () => {
    const { hashPassword, verifyLogin } = await import("./auth");

    selectResult = [
      {
        id: "user-7",
        email: "admin@example.com",
        passwordHash: await hashPassword("secret-password"),
      },
    ];

    const result = await verifyLogin("admin@example.com", "secret-password");

    expect(result).toEqual({ userId: "user-7" });
  });

  it("verifyLogin returns null for unknown email", async () => {
    const { verifyLogin } = await import("./auth");

    selectResult = [];

    const result = await verifyLogin("missing@example.com", "secret-password");

    expect(result).toBeNull();
  });
});
