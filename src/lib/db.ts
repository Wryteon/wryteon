import { db, Posts, SiteSettings, eq, desc } from "astro:db";

import type { PostPayload, PostStatus } from "../types/post";

export const SITE_SETTING_DEFAULTS: Record<string, string> = {
    blogName: "Wryteon",
    blogHeadline: "A modern block-based blogging CMS built with Astro",
};

export type PostRecord = typeof Posts.$inferSelect;

type LogDetails = Record<string, unknown>;

// Basic logger to keep DB traces consistent.
function logDb(operation: string, details: LogDetails = {}) {
    console.info(`[db] ${operation}`, details);
}

function resolvePublishedAt(
    status: PostStatus,
    publishedAt?: string | Date | null,
) {
    if (status !== "published") {
        return null;
    }

    if (!publishedAt) {
        return new Date();
    }

    const parsed =
        publishedAt instanceof Date ? publishedAt : new Date(publishedAt);

    return Number.isNaN(parsed.valueOf()) ? new Date() : parsed;
}

export async function getPostBySlug(slug: string): Promise<PostRecord | null> {
    const result = await db
        .select()
        .from(Posts)
        .where(eq(Posts.slug, slug))
        .limit(1);

    const post = result[0] ?? null;
    logDb("getPostBySlug", { slug, found: Boolean(post) });

    return post;
}

export async function getPublishedPosts(): Promise<PostRecord[]> {
    const posts = await db
        .select()
        .from(Posts)
        .where(eq(Posts.status, "published"))
        .orderBy(desc(Posts.publishedAt), desc(Posts.updatedAt));

    logDb("getPublishedPosts", { count: posts.length });

    return posts;
}

export async function getAllPosts(): Promise<PostRecord[]> {
    const posts = await db.select().from(Posts).orderBy(desc(Posts.updatedAt));

    logDb("getAllPosts", { count: posts.length });

    return posts;
}

export async function getPostCount(): Promise<number> {
    const rows = await db.select({ id: Posts.id }).from(Posts);
    const count = rows.length;

    logDb("getPostCount", { count });

    return count;
}

export async function getPostStatusCounts(): Promise<Record<PostStatus, number>> {
    const rows = await db.select({ status: Posts.status }).from(Posts);
    const counts: Record<PostStatus, number> = {
        draft: 0,
        published: 0,
    };

    for (const row of rows) {
        if (row.status === "draft" || row.status === "published") {
            counts[row.status] += 1;
        }
    }

    logDb("getPostStatusCounts", counts);

    return counts;
}

export async function savePost(postData: PostPayload): Promise<void> {
    const now = new Date();
    const id = postData.id ?? postData.slug;
    const status = postData.status;
    const publishedAt = resolvePublishedAt(status, postData.publishedAt);
    const blockCount = Array.isArray(postData.blocks)
        ? postData.blocks.length
        : undefined;

    const baseLogDetails: LogDetails = {
        id,
        slug: postData.slug,
        status,
    };

    if (blockCount !== undefined) {
        baseLogDetails.blockCount = blockCount;
    }

    const existing = await db
        .select()
        .from(Posts)
        .where(eq(Posts.id, id))
        .limit(1);

    if (existing.length > 0) {
        await db
            .update(Posts)
            .set({
                title: postData.title,
                slug: postData.slug,
                blocks: postData.blocks,
                status,
                updatedAt: now,
                publishedAt,
            })
            .where(eq(Posts.id, id));

        logDb("savePost:update", { ...baseLogDetails });
        return;
    }

    await db.insert(Posts).values({
        id,
        title: postData.title,
        slug: postData.slug,
        blocks: postData.blocks,
        status,
        createdAt: now,
        updatedAt: now,
        publishedAt,
    });

    logDb("savePost:insert", { ...baseLogDetails });
}

export async function deletePost(id: string): Promise<boolean> {
    logDb("deletePost:attempt", { id });

    const existing = await db
        .select({ id: Posts.id })
        .from(Posts)
        .where(eq(Posts.id, id))
        .limit(1);

    if (existing.length === 0) {
        logDb("deletePost:not-found", { id });
        return false;
    }

    await db.delete(Posts).where(eq(Posts.id, id));
    logDb("deletePost:deleted", { id });
    return true;
}

export async function getSiteSetting(key: string): Promise<string> {
    const result = await db
        .select()
        .from(SiteSettings)
        .where(eq(SiteSettings.key, key))
        .limit(1);

    return result[0]?.value ?? SITE_SETTING_DEFAULTS[key] ?? "";
}

export async function getSiteSettings(): Promise<Record<string, string>> {
    const rows = await db.select().from(SiteSettings).orderBy(SiteSettings.key);
    const settings: Record<string, string> = { ...SITE_SETTING_DEFAULTS };

    for (const row of rows) {
        settings[row.key] = row.value;
    }

    logDb("getSiteSettings", { keys: Object.keys(settings) });
    return settings;
}

export async function setSiteSetting(key: string, value: string): Promise<void> {
    const existing = await db
        .select()
        .from(SiteSettings)
        .where(eq(SiteSettings.key, key))
        .limit(1);

    if (existing.length > 0) {
        await db
            .update(SiteSettings)
            .set({ value })
            .where(eq(SiteSettings.key, key));

        logDb("setSiteSetting:update", { key });
        return;
    }

    await db.insert(SiteSettings).values({ key, value });
    logDb("setSiteSetting:insert", { key });
}