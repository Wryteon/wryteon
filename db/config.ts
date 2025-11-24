import { defineDb, defineTable, column } from "astro:db";

export const Users = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    username: column.text({ unique: true }),
    email: column.text({ unique: true }),
    passwordHash: column.text(),
    createdAt: column.date(),
  },
});

export const Sessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text({ references: () => Users.columns.id }),
    token: column.text({ unique: true }),
    expiresAt: column.date(),
    createdAt: column.date(),
  },
});

export const Posts = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    title: column.text(),
    slug: column.text(),
    blocks: column.json(),
    status: column.text(),
    createdAt: column.date(),
    updatedAt: column.date(),
    publishedAt: column.date({ optional: true }),
  },
});

export default defineDb({
  tables: { Users, Sessions, Posts },
});
