import { WebsiteMeta } from "@/core/meta.core";
import { createChannel, useReceiverWithDefault } from "@/utils/channel";
import classNames from "classnames";
import { useRouter } from "next/router";
import { useState } from "react";
import { BiMenu, BiX } from "react-icons/bi";
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

const [smallMaskVisibleSender, smallMaskVisibleRM] = createChannel<boolean>();

export function AppBarMenuMask() {
  const router = useRouter();
  const visible = useReceiverWithDefault(smallMaskVisibleRM, false);
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
            router.push(conf.to);
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
