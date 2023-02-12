export const TAGS = {
    'fe': {
        name: {
            en: 'FrontEnd',
            cn: '前端',
        }
    },
}

export interface PostMeta {
    date: number;
    title: string;
    path: string;
    draft: boolean;
    abstract: string;
    references: Array<[string, string]>;
}

export function getPostHref(meta: PostMeta) {
    return `/blog/${encodeURIComponent(meta.path)}`;
}