import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppBar, AppBarMenuMask } from "./appbar";
import styles from "./layout.module.scss";

export function Layout({ children }: React.PropsWithChildren<{}>) {
  return (
    <div className={styles.layout}>
      <div className={styles.internal}>{children}</div>
    </div>
  );
}

const scrollContext = createContext(0)

export function useGlobalScroll() {
  return useContext(scrollContext)
}

export function FullscreenScrollable({
  children,
}: React.PropsWithChildren<{}>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setScrollTop(containerRef.current?.scrollTop ?? 0)
  }, [])

  return (
    <scrollContext.Provider value={scrollTop}>
      <div
        className={styles.fullscreenScrollable}
        ref={containerRef}
        onScroll={(ev) => {
          setScrollTop(ev.currentTarget.scrollTop);
        }}
      >
        <div className={styles.internal}>{children}</div>
      </div>
    </scrollContext.Provider>
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
