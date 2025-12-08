import { db, Posts, eq, desc } from "astro:db";

import type { PostPayload, PostStatus } from "../types/post";

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