import styles from "./layout.module.scss";

export function Layout({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className={styles.layout}>
      <div className={styles.internal}>{children}</div>
    </div>
  );
}

export function FullscreenScrollable({
  children,
}: React.PropsWithChildren<{}>) {
  return (
    <div className={styles.fullscreenScrollable}>
      <div className={styles.internal}>{children}</div>
    </div>
  );
}
