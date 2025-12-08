export type EditorBlock<TData = Record<string, unknown>> = {
    id?: string;
    type: string;
    data: TData;
};

export interface EditorDocument {
    time?: number;
    version?: string;
    blocks: EditorBlock[];
}
