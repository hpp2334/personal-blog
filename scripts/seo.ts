import { execSync } from "child_process";
import path from "path";
import { WebsiteMeta } from "../src/core/meta.core";
import { PostMeta } from "../src/core/post.core";
import { getPosts, mapPostSlug } from "../src/data/posts.data";
import { fmtDate } from "../src/utils/common";
import { writeFileSync } from "fs";

const ROOT = path.resolve(__dirname, '../')

const runCommand = (s: string) => {
    execSync(s, {
        stdio: 'inherit',
        cwd: ROOT
    })
}
const log = (s: string) => {
    console.log(s)
}

async function emitSiteMapXML() {
    const posts = await getPosts()
    const infos = posts.map(post => {
        return {
            ...mapPostSlug(post),
            date: post.date,
            hasEn: post.has_en,
        }
    })
        .map((t) => ({
            slug: t.slug,
            date: fmtDate(t.date, "YYYY-MM-DD"),
            hasEn: t.hasEn,
        }));
    const currentDate = fmtDate(Date.now(), "YYYY-MM-DD")

    const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://${WebsiteMeta.host}</loc>
        <lastmod>${currentDate}</lastmod>
    </url>
    <url>
        <loc>https://${WebsiteMeta.host}/materials</loc>
        <lastmod>${currentDate}</lastmod>
    </url>
    <url>
        <loc>https://${WebsiteMeta.host}/en</loc>
        <lastmod>${currentDate}</lastmod>
    </url>
    <url>
        <loc>https://${WebsiteMeta.host}/en/materials</loc>
        <lastmod>${currentDate}</lastmod>
    </url>
    ${infos
            .map(({ slug, date, hasEn }) => {
                return [
                    `    <url>
        <loc>https://${`${WebsiteMeta.host}/blog/${slug}`}</loc>
        <lastmod>${date}</lastmod>
    </url>`,
                    !hasEn ? "" : `    <url>
        <loc>https://${`${WebsiteMeta.host}/en/blog/${slug}`}</loc>
        <lastmod>${date}</lastmod>
    </url>`
                ].filter(Boolean);
            }).flat()
            .join("\n")}
</urlset>`;

    writeFileSync(path.resolve(ROOT, "./public/sitemap.xml"), sitemapXML)
}

async function work() {
    log("emit sitemap.xml")
    emitSiteMapXML()
}
work()