import path from "path";
import fs from 'fs/promises'
import { existsSync } from "fs";


const POSTS_DRAFT_DIR = path.resolve(process.cwd(), './posts/draft');
const POSTS_RELEASE_DIR = path.resolve(process.cwd(), './posts/release');

interface BuildContext {
    draft: boolean;
}

interface PostMeta {
    date: Date;
    title: string;
    path: string;
    draft: boolean;
}


async function parseMeta(ctx: BuildContext, metaYaml: Buffer): Promise<PostMeta> {
    const yaml = await import('yaml');
    const ret = yaml.parse(metaYaml.toString('utf-8'));
    {
        // @unsafe
        ret.date = new Date(ret.date);
        ret.draft = ctx.draft;
    }
    return ret;
}

async function getMeta(ctx: BuildContext, postDir: string): Promise<PostMeta | null> {
    const yamlFilepath = path.resolve(postDir, 'meta.yaml');
    if (!existsSync(yamlFilepath)) {
        return null;
    }
    const data = await fs.readFile(yamlFilepath);
    return parseMeta(ctx, data);
}

async function getMetas(postsDir: string, isDraft: boolean): Promise<PostMeta[]> {
    const ctx: BuildContext = {
        draft: isDraft,
    }
    const ret: PostMeta[] = []
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

export async function getPosts() {
    const metas = [
        ...(await getMetas(POSTS_DRAFT_DIR, true)),
        ...(await getMetas(POSTS_RELEASE_DIR, false)),
    ];
    metas.sort((a, b) => b.date.getTime() - a.date.getTime());
    return metas;
}