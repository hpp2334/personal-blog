import { WebsiteMeta } from "@/core/meta.core";
import { PostMeta } from "@/core/post.core";
import { getPosts, mapPostSlug } from "@/data/posts.data";
import { fmtDate } from "@/utils/common";
import { GetServerSideProps } from "next";

function generateSiteMap(posts: Array<PostMeta>) {
  const infos = posts.map(post => {
    return {
      ...mapPostSlug(post),
      date: post.date,
    }
  })
    .filter((t) => !t.draft)
    .map((t) => ({
      slug: t.slug,
      date: fmtDate(t.date, "YYYY-MM-DD"),
    }));
  const currentDate = fmtDate(Date.now(), "YYYY-MM-DD")

  return `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       <!--We manually set the two URLs we know already-->
       <url>
         <loc>https://${WebsiteMeta.host}</loc>
         <lastmod>${currentDate}</lastmod>
       </url>
       <url>
         <loc>https://${WebsiteMeta.host}/materials</loc>
         <lastmod>${currentDate}</lastmod>
       </url>
       ${infos
      .map(({ slug, date }) => {
        return `<url>
         <loc>https://${`${WebsiteMeta.host}/blog/${slug}`}</loc>
         <lastmod>${date}</lastmod>
       </url>
       `;
      })
      .join("")}
      </urlset>
   `;
}

function SiteMap() {
  // getServerSideProps will do the heavy lifting
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const metas = await getPosts();
  const sitemap = generateSiteMap(metas);

  res.setHeader("Content-Type", "application/xml");
  // we send the XML to the browser
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
};

export default SiteMap;
