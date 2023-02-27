interface TagInfo {
  name: {
    en: string;
    cn: string;
  };
}

export const TAGS: Record<string, TagInfo | undefined> = {
  fe: {
    name: {
      en: "FrontEnd",
      cn: "前端",
    },
  },
};

export interface PostMeta {
  date: number;
  title: string;
  path: string;
  draft: boolean;
  abstract: string;
  requirements: string[];
  references: Array<[string, string]>;
  tags: string[];
  environment: Array<[string, string]>;
}

export interface Post {
  meta: PostMeta;
  rawStr: string;
}

export function getPostHref(meta: PostMeta, draft?: boolean) {
  let p = `/blog/${encodeURIComponent(meta.path)}`;
  const queries: string[] = [];
  if (draft) {
    queries.push("draft=1");
  }
  if (queries.length > 0) {
    p = p + "?" + queries.join("&");
  }
  return p;
}
