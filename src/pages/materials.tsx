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
  toolMaterials,
} from "@/core/material.core";
import { SEO } from "@/widgets/seo.widget";
import { WebsiteMeta } from "@/core/meta.core";
import { useRouter } from "next/router";

const R = {
  H2_RECOMMEND: {
    cn: "这里收集了一些笔者认为不错的系统化的资料",
    en: "Some systematically organized materials",
  },
  H2_TOOLS: {
    cn: "这里收集了一些有时会用到的工具",
    en: "Some useful tools",
  },
  H2_SELF: {
    cn: "这里是笔者的一些项目",
    en: "Some projects by myself",
  },
};

function MaterialItemCard({
  item,
  isEN,
}: {
  item: MaterialItem;
  isEN: boolean;
}) {
  const description = isEN ? item.description_en : item.description;

  return (
    <a
      className={styles.item}
      href={item.link}
      target="_blank"
      rel="noreferrer"
    >
      <div className={styles.title}>{item.title}</div>
      <div className={styles.desc}>{description}</div>
    </a>
  );
}

function MaterialItems({
  config,
  isEN,
}: {
  config: MaterialConfig;
  isEN: boolean;
}) {
  return (
    <>
      {config.map((conf, idx) => (
        <div key={idx}>
          <div className={styles.section}>{conf.section}</div>
          <div className={styles.itemsContainer}>
            {conf.items.map((item, idx) => (
              <MaterialItemCard key={idx} item={item} isEN={isEN} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const isEN = router.locale === "en";
  const description = isEN
    ? WebsiteMeta.description_en
    : WebsiteMeta.description;

  return (
    <>
      <SEO subTitle="Materials" description={description} />
      <CommonLayout className={styles.materials}>
        <h2 className={styles.title}>Recommend Materials</h2>
        <h3 className={styles.subTitle}>
          {!isEN ? R.H2_RECOMMEND.cn : R.H2_RECOMMEND.en}
        </h3>
        <MaterialItems config={recommendMaterials} isEN={isEN} />
        <h2 className={styles.title}>Tools</h2>
        <h3 className={styles.subTitle}>
          {!isEN ? R.H2_TOOLS.cn : R.H2_TOOLS.en}
        </h3>
        <MaterialItems config={toolMaterials} isEN={isEN} />
        <h2 className={styles.title}>My Materials</h2>
        <h3 className={styles.subTitle}>
          {!isEN ? R.H2_SELF.cn : R.H2_SELF.en}
        </h3>
        <MaterialItems config={selfMaterials} isEN={isEN} />
      </CommonLayout>
    </>
  );
}
