import { GetStaticPaths, GetStaticProps } from "next";
import { getPost, getPosts, getPostsSlug } from "@/data/posts.data";
import Link from "next/link";
import { getPostHref, Post, PostMeta, TAGS } from "@/core/post.core";
import { marked } from "marked";
import constate from "constate";
import React, { useMemo } from "react";
import { PostContentWidget, PostProvider } from "@/widgets/post.widget";
import styles from "./slug.module.scss";
import { fmtDate } from "@/utils/common";
import classNames from "classnames";
import { AppBar, AppBarMenuMask } from "@/widgets/appbar";
import { FullscreenScrollable, Layout } from "@/widgets/layout";
import { SEO } from "@/widgets/seo.widget";

interface UrlQuery {
  slug: string[];
  draft?: string;

  [key: string]: string | string[] | undefined;
}

interface Props {
  post: Post;
}

export const getStaticPaths: GetStaticPaths<UrlQuery> = async () => {
  const metas = await getPosts();

  return {
    paths: getPostsSlug(metas).map((t) => ({
      params: t,
    })),
    fallback: false, // can also be true or 'blocking'
  };
};

export const getStaticProps: GetStaticProps<Props, UrlQuery> = async (
  context
) => {
  const slug = context.params?.slug ?? [];
  const draft = Boolean(context.params?.draft);
  const post = await getPost(slug, draft);

  if (!post) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      post,
    }, // will be passed to the page component as props
  };
};

function PostContent() {
  return <PostContentWidget />;
}

function PostHeader({ meta }: { meta: PostMeta }) {
  return (
    <div className={styles.header}>
      <div className={styles.date}>{fmtDate(meta.date, "YYYY年MM月DD日")}</div>
      <h1 className={styles.title}>{meta.title}</h1>
      <div className={styles.tags}>
        {meta.tags.map((t) => (
          <div key={t} className={styles.tag}>
            {TAGS[t]?.name.cn ?? t}
          </div>
        ))}
      </div>
      <div className={styles.cards}>
        {meta.references.length > 0 && (
          <div className={classNames(styles.references)}>
            <div className={styles.title}>references</div>
            {meta.references.map(([t, href], idx) => (
              <a
                key={idx}
                href={href}
                target="_blank"
                rel="noreferrer"
                className={styles.reference}
              >
                <div className={styles.text}>{t}</div>
                <div className={styles.link}>{href}</div>
              </a>
            ))}
          </div>
        )}
        {meta.requirements.length > 0 && (
          <div className={classNames(styles.requirements)}>
            <div className={styles.title}>requirements</div>
            {meta.requirements.map((t, idx) => (
              <div key={idx}>{t}</div>
            ))}
          </div>
        )}
        {meta.environment.length > 0 && (
          <div className={classNames(styles.environments)}>
            <div className={styles.title}>environments</div>
            {meta.environment.map(([e, v], idx) => (
              <div key={idx}>
                {e}: {v}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetail({ post }: Props) {
  return (
    <>
      <SEO subTitle={post.meta.title} description={post.meta.abstract} />
      <AppBarMenuMask />
      <FullscreenScrollable>
        <div className={styles.mask} />
        <AppBar />
        <PostProvider
          rawStr={post.rawStr}
          codeDemo={{ codes: post.meta.codes }}
        >
          <main className={styles.slug}>
            <Layout>
              <PostHeader meta={post.meta} />
              <PostContent />
            </Layout>
          </main>
        </PostProvider>
      </FullscreenScrollable>
    </>
  );
}
