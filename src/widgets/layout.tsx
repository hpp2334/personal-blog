import { AppBar, AppBarMenuMask } from "./appbar";
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

export function CommonLayout({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <>
      <div className={styles.bgMask} />
      <AppBarMenuMask />
      <FullscreenScrollable>
        <AppBar />
        <main className={className}>
          <Layout>{children}</Layout>
        </main>
      </FullscreenScrollable>
    </>
  );
}
