import { WebsiteMeta } from "@/core/meta.core";
import Head from "next/head";

export interface SEOProps {
  subTitle?: string;
  description: string;
}

export function SEO({ subTitle, description }: SEOProps) {
  const title = subTitle
    ? `${subTitle} | ${WebsiteMeta.title}`
    : WebsiteMeta.title;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
  );
}
