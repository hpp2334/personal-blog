import * as pathUtil from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { CodeDemoEntry, Post, PostMeta, PostMetaStore, RawPostMeta } from "@/core/post.core";
import yaml from "yaml";

const POSTS_DIR = pathUtil.resolve(process.cwd(), "./posts");

interface BuildContext {
  postsDir: string;
}

async function parseMeta(
  ctx: BuildContext,
  postDir: string,
  metaYaml: Buffer
): Promise<PostMeta> {
  const _ret = yaml.parse(metaYaml.toString("utf-8")) as RawPostMeta;

  const has_en = _ret.has_en ?? false
  const path = _ret.path ?? pathUtil.relative(ctx.postsDir, postDir);
  const title = _ret.title
  const title_en = _ret.title_en ?? ''
  const date = new Date(_ret.date).getTime();
  const abstract = _ret.abstract ?? ""
  const abstract_en = _ret.abstract_en ?? ""
  const requirements = _ret.requirements ?? []
  const references = _ret.references ?? []
  const tags = _ret.tags ?? []
  const environment = _ret.environment ?? []
  const codeDemoEntries: CodeDemoEntry[] = []

  if (_ret.codeDemo) {
    const _codeDemo = _ret.codeDemo;
    const root = _codeDemo.root;
    const _codes = _codeDemo.codes;
    for (const code of _codes) {
      const entry: CodeDemoEntry = {
        key: code.key,
        path: code.path,
        entry: code.entry ?? '',
        files: [],
        template: code.template
      }
      for (const filePath of code.files) {
        entry.files.push({
          path: filePath,
          data: await fs.readFile(
            pathUtil.join(postDir, root, code.path, filePath),
            "utf-8"
          ),
        });
      }
      codeDemoEntries.push(entry);
    }
  }
  const store: PostMetaStore = {
    has_en,
    date,
    title,
    title_en,
    path,
    abstract,
    abstract_en,
    requirements,
    references,
    tags,
    environment,
    codes: codeDemoEntries,
  }
  return new PostMeta(store);
}

async function getMeta(
  ctx: BuildContext,
  postDir: string
): Promise<PostMeta | null> {
  const yamlFilepath = pathUtil.resolve(postDir, "meta.yaml");
  if (!existsSync(yamlFilepath)) {
    return null;
  }
  const data = await fs.readFile(yamlFilepath);
  return parseMeta(ctx, postDir, data);
}

async function getMetas(
  postsDir: string
): Promise<PostMeta[]> {
  const ctx: BuildContext = {
    postsDir,
  };
  const ret: PostMeta[] = [];
  const postPaths = await fs.readdir(postsDir);
  for (const p of postPaths) {
    const postDir = pathUtil.resolve(postsDir, p);
    const meta = await getMeta(ctx, postDir);
    if (meta) {
      ret.push(meta);
    }
  }
  return ret;
}

export async function getPosts(): Promise<PostMeta[]> {
  const metas = [
    ...(await getMetas(POSTS_DIR)),
  ];
  metas.sort((a, b) => b.date - a.date);
  return metas;
}

export function mapPostSlug(meta: PostMeta) {
  const slug = meta.path.split("/").filter(Boolean);
  return {
    slug,
  };
}

export function getPostsSlug(metas: PostMeta[]) {
  return metas.map(mapPostSlug);
}

export async function getPost(
  slug: string[],
  locale: string | undefined
): Promise<Post | null> {
  const postsDir = POSTS_DIR;
  const postDir = pathUtil.join(postsDir, ...slug);
  const ctx: BuildContext = {
    postsDir,
  };
  const meta = await getMeta(ctx, postDir);

  if (!meta) {
    return null;
  }

  const cnFilePath = pathUtil.join(postDir, "index.md");
  const enFilePath = pathUtil.join(postDir, "index.en.md");
  const filePath = locale === 'en' && meta.has_en ? enFilePath : cnFilePath
  const rawStr = await fs.readFile(filePath, "utf-8");

  return {
    meta,
    rawStr,
  };
}
