import { WebsiteMeta } from "@/core/meta.core";
import classNames from "classnames";
import { useRouter } from "next/router";
import styles from "./appbar.module.scss";

const config = [
  {
    label: "Posts",
    test: (p: string) => p === "/" || p.startsWith("/blog"),
    to: "/",
  },
  {
    label: "Projects",
    test: (p: string) => p.startsWith("/projects"),
    to: "/projects",
  },
  {
    label: "Materials",
    test: (p: string) => p.startsWith("/materials"),
    to: "/materials",
  },
  {
    label: "About",
    test: (p: string) => p.startsWith("/about"),
    to: "/materials",
  },
];

export function AppBar() {
  const router = useRouter();

  return (
    <div className={styles.appbar}>
      <div className={styles.left}>{WebsiteMeta.title}</div>
      <div className={styles.navs}>
        {config.map((conf, idx) => {
          const active = conf.test(router.pathname);
          const handleClick = () => {
            router.push(conf.to);
          };
          return (
            <div
              key={idx}
              onClick={handleClick}
              className={classNames({
                [styles.nav]: true,
                [styles.active]: active,
              })}
            >
              {conf.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
