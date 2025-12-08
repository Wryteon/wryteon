import { defineDb, defineTable, column } from 'astro:db';

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
    tables: { Posts },
});