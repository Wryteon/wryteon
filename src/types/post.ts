import type { EditorDocument } from "./editor";

export type PostStatus = "draft" | "published";

export interface PostPayload {
    id: string;
    title: string;
    slug: string;
    blocks: EditorDocument;
    status: PostStatus;
    publishedAt?: string | Date | null;
}
