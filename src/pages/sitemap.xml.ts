import { WebsiteMeta } from "@/core/meta.core";
import { PostMeta } from "@/core/post.core";
import { getPosts, getPostsSlug } from "@/data/posts.data";
import { GetServerSideProps } from "next";

function generateSiteMap(posts: Array<PostMeta>) {
  const slugs = getPostsSlug(posts)
    .filter((t) => !t.draft)
    .map((t) => t.slug);

  return `<?xml version="1.0" encoding="UTF-8"?>
     <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
       <!--We manually set the two URLs we know already-->
       <url>
         <loc>https://${WebsiteMeta.host}</loc>
       </url>
       <url>
         <loc>https://${WebsiteMeta.host}/materials</loc>
       </url>
       ${slugs
         .map((slug) => {
           return `<url>
         <loc>https://${`${WebsiteMeta.host}/blog/${slug}`}</loc>
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
