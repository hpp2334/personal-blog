import { WebsiteMeta } from "@/core/meta.core";
import { createChannel, useReceiverWithDefault } from "@/utils/channel";
import classNames from "classnames";
import { NextRouter, useRouter } from "next/router";
import { useState } from "react";
import { BiMenu, BiX } from "react-icons/bi";
import styles from "./appbar.module.scss";

function getConfig(locale: string | undefined) {
  const config = [
    {
      label: "Posts",
      test: (p: string) => p === "/" || p.startsWith("/blog"),
      to: "/",
    },
    {
      label: "Materials",
      test: (p: string) => p.startsWith("/materials"),
      to: "/materials",
    },
    {
      label: "EN",
      test: () => false,
      filter: (locale: string | undefined) => !locale || locale === 'cn',
      locale: "en",
    },
    {
      label: "中",
      test: () => false,
      filter: (locale: string | undefined) => locale === 'en',
      locale: "cn",
    },
    //   {
    //     label: "About",
    //     test: (p: string) => p.startsWith("/about"),
    //     to: "/about",
    //   },
  ];

  return config.filter(conf => {
    return !conf.filter || conf.filter(locale)
  })
}

function navigate(router: NextRouter, conf: ReturnType<typeof getConfig>[0]) {
  let to = conf.to ?? router.asPath
  router.push(to, undefined, { locale: conf.locale })
}

const [smallMaskVisibleSender, smallMaskVisibleRM] = createChannel<boolean>();

export function AppBarMenuMask() {
  const router = useRouter();
  const visible = useReceiverWithDefault(smallMaskVisibleRM, false);
  const config = getConfig(router.locale)

  return (
    <div
      className={classNames({
        [styles.appMenuMask]: true,
        [styles.visible]: visible,
      })}
    >
      <div className={styles.internal}>
        <BiX
          className={styles.closeBtn}
          onClick={() => {
            smallMaskVisibleSender.send(false);
          }}
        />
        {config.map((conf, idx) => {
          const active = conf.test(router.pathname);
          const handleClick = () => {
            smallMaskVisibleSender.send(false);
            navigate(router, conf);
          };
          return (
            <div
              key={idx}
              onClick={handleClick}
              className={classNames({
                [styles.item]: true,
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

export function AppBar() {
  const router = useRouter();
  const config = getConfig(router.locale)

  return (
    <div className={styles.appbar}>
      <div className={styles.big}>
        <div
          className={styles.left}
          onClick={() => {
            router.push("/");
          }}
        >
          {WebsiteMeta.title}
        </div>
        <div className={styles.navs}>
          {config.map((conf, idx) => {
            const active = conf.test(router.pathname);
            const handleClick = () => {
              navigate(router, conf);
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
      <div className={styles.small}>
        <div
          className={styles.left}
          onClick={() => {
            router.push("/");
          }}
        >
          {WebsiteMeta.title}
        </div>
        <BiMenu
          className={styles.menuBtn}
          onClick={() => {
            smallMaskVisibleSender.send(true);
          }}
        />
      </div>
    </div>
  );
}
