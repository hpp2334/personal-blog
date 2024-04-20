import { GetStaticProps } from "next";
import { getPosts } from "@/data/posts.data";
import Link from "next/link";
import { getPostHref, getTag, PostMeta, PostMetaStore } from "@/core/post.core";
import { fmtDate } from "@/utils/common";
import styles from "./home.module.scss";
import { CommonLayout, FullscreenScrollable, Layout } from "@/widgets/layout";
import { SEO } from "@/widgets/seo.widget";
import { WebsiteMeta } from "@/core/meta.core";
import { useRouter } from "next/router";

interface Props {
  metaStores: PostMetaStore[];
}

export const getStaticProps: GetStaticProps<Props> = async (context) => {
  const metas = await getPosts();
  const metaStores = metas.map(meta => meta.toStore())
  return {
    props: {
      metaStores,
    }, // will be passed to the page component as props
  };
};

function _PostCard({
  meta,
  locale,
}: {
  meta: PostMeta,
  locale: string | undefined
}) {
  const router = useRouter()
  const title = meta.getTitle(locale)
  const description = meta.getAbstract(locale)

  return (
    <Link className={styles.post} href={getPostHref(meta)}>
      <div className={styles.date}>
        {fmtDate(meta.date, "YYYY-MM-DD")}
      </div>
      <div className={styles.title}>{title}</div>
      <div className={styles.description}>{description}</div>
      <div className={styles.tags}>
        {meta.tags.map((t, idx) => (
          <div key={idx} className={styles.tag}>
            {getTag(t, router.locale)}
          </div>
        ))}
      </div>
    </Link>
  )
}

function _Divider({ text }: { text: string }) {
  return (
    <div className={styles.divider}>{text}</div>
  )
}

export default function Home(props: Props) {
  const router = useRouter()
  const { metaStores } = props;
  const isEn = router.locale === 'en'
  const metas = metaStores.map(store => new PostMeta(store))

  const isMetaHasEn = (meta: PostMeta) => meta.has_en

  return (
    <>
      <SEO description={WebsiteMeta.description} />
      <CommonLayout className={styles.home}>
        <div className={styles.posts}>
          {!isEn && (
            <>
              {metas.map((meta, index) => (
                <_PostCard key={index} meta={meta} locale={router.locale} />
              ))}
              <_Divider text="END" />
            </>
          )}
          {isEn && (
            <>
              {metas.filter(isMetaHasEn).map((meta, index) => (
                <_PostCard key={index} meta={meta} locale={router.locale} />
              ))}
              <_Divider text="The following posts are in Chinese only" />
              {metas.filter(meta => !isMetaHasEn(meta)).map((meta, index) => (
                <_PostCard key={index} meta={meta} locale={router.locale} />
              ))}
              <_Divider text="END" />
            </>
          )}
        </div>
      </CommonLayout>
    </>
  );
}
