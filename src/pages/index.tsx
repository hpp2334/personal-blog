import Image from "next/image";
import { GetStaticProps } from "next";
import { getPosts } from "@/data/posts.data";
import Link from "next/link";
import { getPostHref, PostMeta, TAGS } from "@/core/post.core";
import { AppBar, AppBarMenuMask } from "@/widgets/appbar";
import { fmtDate } from "@/utils/common";
import styles from "./home.module.scss";
import { CommonLayout, FullscreenScrollable, Layout } from "@/widgets/layout";
import { SEO } from "@/widgets/seo.widget";
import { WebsiteMeta } from "@/core/meta.core";

interface Props {
  metas: PostMeta[];
}

export const getStaticProps: GetStaticProps<Props> = async (context) => {
  const metas = await getPosts();
  return {
    props: {
      metas,
    }, // will be passed to the page component as props
  };
};

export default function Home(props: Props) {
  const { metas } = props;

  return (
    <>
      <SEO description={WebsiteMeta.description} />
      <CommonLayout className={styles.home}>
        <div className={styles.posts}>
          {metas.map((meta, index) => (
            <Link key={index} className={styles.post} href={getPostHref(meta)}>
              <div className={styles.date}>
                {fmtDate(meta.date, "YYYY年MM月DD日")}
              </div>
              <div className={styles.title}>{meta.title}</div>
              <div className={styles.description}>{meta.abstract}</div>
              <div className={styles.tags}>
                {meta.tags.map((t, idx) => (
                  <div key={idx} className={styles.tag}>
                    {TAGS[t]?.name.cn ?? t}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </CommonLayout>
    </>
  );
}
