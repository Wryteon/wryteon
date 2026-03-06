import { beforeEach, describe, expect, it, vi } from "vitest";

const selectQueue: Array<Array<{ id: string }>> = [];

const limitMock = vi.fn(async () => selectQueue.shift() ?? []);
const whereMock = vi.fn(() => ({ limit: limitMock }));
const fromMock = vi.fn(() => ({ where: whereMock }));
const selectMock = vi.fn(() => ({ from: fromMock }));

const insertValuesMock = vi.fn(async () => undefined);
const insertMock = vi.fn(() => ({ values: insertValuesMock }));

const hashMock = vi.fn(async (_value: string, _rounds: number) => "hashed-password");

function getLatestInsertPayload(): Record<string, unknown> {
  const calls = insertValuesMock.mock.calls as unknown as Array<[Record<string, unknown>]>;
  const latestCall = calls.at(-1);

  if (!latestCall) {
    throw new Error("Expected insertValuesMock to have been called");
  }

  return latestCall[0];
}

vi.mock("astro:db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
  eq: (left: unknown, right: unknown) => ({ left, right }),
}));

vi.mock("@astrojs/db/utils", () => ({
  asDrizzleTable: (_name: string, table: Record<string, unknown>) => table,
}));

vi.mock("../../db/config", () => ({
  Users: {
    id: "id",
    username: "username",
    email: "email",
    passwordHash: "passwordHash",
    createdAt: "createdAt",
  },
}));

vi.mock("bcrypt", () => ({
  hash: hashMock,
}));

describe("db seed", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    selectMock.mockClear();
    fromMock.mockClear();
    whereMock.mockClear();
    limitMock.mockClear();
    insertMock.mockClear();
    insertValuesMock.mockClear();
    hashMock.mockClear();

    process.env.WRYTEON_ADMIN_USERNAME = "admin";
    process.env.WRYTEON_ADMIN_EMAIL = "admin@example.com";
    process.env.WRYTEON_ADMIN_PASSWORD = "secret-password";
  });

  it("creates the admin when username and email are absent", async () => {
    const seedModule = await import("../../db/seed");

    selectQueue.push([], []);

    await seedModule.default();

    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(hashMock).toHaveBeenCalledWith("secret-password", 10);
    expect(insertMock).toHaveBeenCalledTimes(1);

    const payload = getLatestInsertPayload();

    expect(payload).toMatchObject({
      username: "admin",
      email: "admin@example.com",
      passwordHash: "hashed-password",
    });
    expect(payload.createdAt).toBeInstanceOf(Date);
    expect(typeof payload.id).toBe("string");
  });

  it("skips insert when the username already exists", async () => {
    const seedModule = await import("../../db/seed");

    selectQueue.push([{ id: "existing-user" }]);

    await seedModule.default();

    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(hashMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("skips insert when the email already exists", async () => {
    const seedModule = await import("../../db/seed");

    selectQueue.push([], [{ id: "existing-user" }]);

    await seedModule.default();

    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(hashMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });
});