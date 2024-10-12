import { GetStaticPaths, GetStaticProps } from "next";
import { getPost, getPosts, getPostsSlug } from "@/data/posts.data";
import Link from "next/link";
import {
  getPostHref,
  getTag,
  Post,
  PostMeta,
  PostStore,
} from "@/core/post.core";
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
import { useRouter } from "next/router";

interface UrlQuery {
  slug: string[];

  [key: string]: string | string[] | undefined;
}

interface Props {
  postStore: PostStore;
}

export const getStaticPaths: GetStaticPaths<UrlQuery> = async () => {
  const metas = await getPosts();

  return {
    paths: getPostsSlug(metas)
      .map((t) => [
        {
          params: t,
        },
      ])
      .flat(),
    fallback: false, // can also be true or 'blocking'
  };
};

export const getStaticProps: GetStaticProps<Props, UrlQuery> = async (
  context
) => {
  const slug = context.params?.slug ?? [];
  const post = await getPost(slug, context.locale);

  if (!post) {
    return {
      notFound: true,
    };
  }

  const postStore: PostStore = {
    metaStore: post.meta.toStore(),
    rawStr: post.rawStr,
  };

  return {
    props: {
      postStore,
    }, // will be passed to the page component as props
  };
};

function PostContent() {
  return <PostContentWidget />;
}

function PostHeader({ meta }: { meta: PostMeta }) {
  const router = useRouter();
  return (
    <div className={styles.header}>
      <div className={styles.date}>{fmtDate(meta.date, "YYYY-MM-DD")}</div>
      <h1 className={styles.title}>{meta.getTitle(router.locale)}</h1>
      <div className={styles.tags}>
        {meta.tags.map((t) => (
          <div key={t} className={styles.tag}>
            {getTag(t, router.locale)}
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

export default function PostDetail({ postStore }: Props) {
  const post: Post = {
    meta: new PostMeta(postStore.metaStore),
    rawStr: postStore.rawStr,
  };
  const router = useRouter();
  return (
    <>
      <SEO
        subTitle={post.meta.getTitle(router.locale)}
        description={post.meta.getAbstract(router.locale)}
      />
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
