import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { CodeDemoEntry, Post, PostMeta } from "@/core/post.core";
import yaml from "yaml";

const POSTS_DIR = path.resolve(process.cwd(), "./posts");

interface BuildContext {
  postsDir: string;
}

async function parseMeta(
  ctx: BuildContext,
  postDir: string,
  metaYaml: Buffer
): Promise<PostMeta> {
  const ret = yaml.parse(metaYaml.toString("utf-8"));
  {
    // @unsafe
    ret.path = path.relative(ctx.postsDir, postDir);
    ret.date = new Date(ret.date).getTime();
    ret.abstract ??= "";
    ret.requirements ??= [];
    ret.references ??= [];
    ret.tags ??= [];
    ret.environment ??= [];
    ret.codes = [];

    if (ret.codeDemo) {
      const _codeDemo = ret.codeDemo;
      const root = _codeDemo.root;
      const _codes = _codeDemo.codes;
      const codes: Array<CodeDemoEntry> = [];
      for (const code of _codes) {
        const entry: CodeDemoEntry = {
          ...code,
          files: [],
        };
        for (const filePath of code.files) {
          entry.files.push({
            path: filePath,
            data: await fs.readFile(
              path.join(postDir, root, code.path, filePath),
              "utf-8"
            ),
          });
        }
        codes.push(entry);
      }
      ret.codes = codes;
      delete ret.codeDemo;
    }
  }
  return ret;
}

async function getMeta(
  ctx: BuildContext,
  postDir: string
): Promise<PostMeta | null> {
  const yamlFilepath = path.resolve(postDir, "meta.yaml");
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
    const postDir = path.resolve(postsDir, p);
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
): Promise<Post | null> {
  const postsDir = POSTS_DIR;
  const postDir = path.join(postsDir, ...slug);
  const ctx: BuildContext = {
    postsDir,
  };
  const meta = await getMeta(ctx, postDir);

  if (!meta) {
    return null;
  }

  const filePath = path.join(postDir, "index.md");
  const rawStr = await fs.readFile(filePath, "utf-8");

  return {
    meta,
    rawStr,
  };
}
