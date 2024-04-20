import { GetStaticProps } from "next";
import { getPosts } from "@/data/posts.data";
import { PostMeta, PostMetaStore } from "@/core/post.core";
import styles from "./materials.module.scss";
import { CommonLayout } from "@/widgets/layout";
import {
  MaterialConfig,
  MaterialItem,
  recommendMaterials,
  selfMaterials,
} from "@/core/material.core";
import { SEO } from "@/widgets/seo.widget";
import { WebsiteMeta } from "@/core/meta.core";
import { useRouter } from "next/router";

interface Props {
  metaStores: PostMetaStore[];
}

function MaterialItemCard({ item }: { item: MaterialItem }) {
  return (
    <a
      className={styles.item}
      href={item.link}
      target="_blank"
      rel="noreferrer"
    >
      <div className={styles.title}>{item.title}</div>
      <div className={styles.desc}>{item.description}</div>
    </a>
  );
}

function MaterialItems({ config }: { config: MaterialConfig }) {
  return (
    <>
      {config.map((conf, idx) => (
        <div key={idx}>
          <div className={styles.section}>{conf.section}</div>
          <div className={styles.itemsContainer}>
            {conf.items.map((item, idx) => (
              <MaterialItemCard key={idx} item={item} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const router = useRouter()
  const isEN = router.locale === 'en'
  const description = isEN ? WebsiteMeta.description_en : WebsiteMeta.description

  return (
    <>
      <SEO subTitle="Materials" description={description} />
      <CommonLayout className={styles.materials}>
        <h2 className={styles.title}>Recommend Materials</h2>
        <h3 className={styles.subTitle}>
          这里收集了一些笔者认为不错的系统化的资料
        </h3>
        <MaterialItems config={recommendMaterials} />
        <h2 className={styles.title}>My Materials</h2>
        <h3 className={styles.subTitle}>这里是笔者的一些项目</h3>
        <MaterialItems config={selfMaterials} />
      </CommonLayout>
    </>
  );
}
