interface TagInfo {
  name: {
    en: string;
    cn: string;
  };
}

const TAGS: Record<string, TagInfo | undefined> = {
  fe: {
    name: {
      en: "FrontEnd",
      cn: "前端",
    },
  },
  react: {
    name: {
      en: "React",
      cn: "React",
    },
  },
  source: {
    name: {
      en: "Source Analysis",
      cn: "源码分析",
    },
  },
  ng: {
    name: {
      en: "Angular",
      cn: "Angular",
    },
  },
  typescript: {
    name: {
      en: "TypeScript",
      cn: "TypeScript",
    },
  },
  rust: {
    name: {
      en: "Rust",
      cn: "Rust",
    },
  },
  cpp: {
    name: {
      en: "C++",
      cn: "C++",
    },
  },
  css: {
    name: {
      en: "CSS",
      cn: "CSS",
    },
  },
  webpack: {
    name: {
      en: "Webpack",
      cn: "Webpack",
    },
  },
  render: {
    name: {
      en: "Render",
      cn: "渲染"
    }
  }
};

export interface CodeDemoEntry {
  key: string;
  path: string;
  entry: string;
  files: Array<{
    path: string;
    data: string;
  }>;
  template: string;
}

export interface PostMetaStore {
  has_en: boolean
  date: number
  title: string
  title_en: string
  path: string
  abstract: string
  abstract_en: string
  requirements: string[]
  references: Array<[string, string]>
  tags: string[]
  environment: Array<[string, string]>
  codes: CodeDemoEntry[]
}

export class PostMeta {
  private _store: PostMetaStore
  constructor(store: PostMetaStore) {
    this._store = store
  }

  public get has_en() { return this._store.has_en }
  public get date() { return this._store.date }
  public getTitle(locale: string | undefined) { return locale === 'en' && this._store.has_en ? this._store.title_en : this._store.title }
  public get path() { return this._store.path }
  public getAbstract(locale: string | undefined) { return locale === 'en' && this._store.has_en ? this._store.abstract_en : this._store.abstract }
  public get requirements() { return this._store.requirements }
  public get references() { return this._store.references }
  public get tags() { return this._store.tags }
  public get environment() { return this._store.environment }
  public get codes() { return this._store.codes }

  public toStore(): PostMetaStore {
    return { ...this._store }
  }
}

export interface RawPostMeta {
  has_en?: boolean,
  date: number;
  title: string;
  title_en?: string
  path: string;
  abstract: string;
  abstract_en?: string
  requirements: string[];
  references: Array<[string, string]>;
  tags: string[];
  environment: Array<[string, string]>;
  codeDemo: {
    root: string,
    codes: Array<{
      key: string,
      path: string,
      entry: string | undefined,
      files: string[],
      template: string,
    }>
  }
}

export interface PostStore {
  metaStore: PostMetaStore;
  rawStr: string;
}

export interface Post {
  meta: PostMeta;
  rawStr: string;
}

export function getPostHref(meta: PostMeta) {
  let p = `/blog/${encodeURIComponent(meta.path)}`;
  const queries: string[] = [];
  if (queries.length > 0) {
    p = p + "?" + queries.join("&");
  }
  return p;
}

export function getTag(t: string, locale: string | undefined) {
  locale = locale ?? "cn"
  const tagObject = TAGS[t]

  if (tagObject) {
    return locale === 'en' ? tagObject.name.en : tagObject.name.cn
  }
  return t
}
