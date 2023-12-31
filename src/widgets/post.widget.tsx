import 'katex/dist/katex.min.css';
import { marked } from "marked";
import React, { useEffect, useMemo, useRef, useState } from "react";
import NextLink from "next/link";
import NextImage from "next/image";
import styles from "./post.module.scss";
import classnames from "classnames";
import { Highlighter } from "./code.widget";
import dynamic from "next/dynamic";
import yaml from "yaml";
import constate from "constate";
// @ts-ignore
import { githubLight } from "@codesandbox/sandpack-themes";
import { decodeHTMLEntities } from "@/utils/common";
import 'katex/dist/katex.min.css';
import { useGlobalScroll } from './layout';

export interface CodeDemo {
  codes: Array<{
    key: string;
    path: string;
    entry: string;
    files: Array<{
      path: string;
      data: string;
    }>;
    template: string;
  }>;
}

const Stackblitz = dynamic(() =>
  import("./stackblitz.widget").then((v) => v.Stackblitz)
);
const Sandpack = dynamic(() =>
  import("@codesandbox/sandpack-react").then((v) => v.Sandpack)
);
const InlineMath = dynamic(() => import('react-katex').then(v => v.InlineMath))
const BlockMath = dynamic(() => import('react-katex').then(v => v.BlockMath))

function usePost({
  rawStr,
  codeDemo,
}: {
  rawStr: string;
  codeDemo?: CodeDemo;
}) {
  const tokens = useMemo(() => {
    const lexer = new marked.Lexer();
    return lexer.lex(rawStr);
  }, [rawStr]);

  const codeDemoMap = useMemo(() => {
    const list = codeDemo?.codes.map((t) => [t.key, t] as const) ?? [];
    return new Map(list);
  }, [codeDemo]);

  return {
    tokens,
    codeDemoMap,
  };
}
export const [PostProvider, usePostContext] = constate(usePost);

function CommonToken({ token }: { token: marked.Token }) {
  if (
    "tokens" in token &&
    token.tokens &&
    token.type !== "link" &&
    token.type !== "strong"
  ) {
    return <CommonTokens tokens={token.tokens ?? []} />;
  }
  switch (token.type) {
    case "escape":
    case "text":
    case "paragraph":
      const t = decodeHTMLEntities(token.text);
      return <>{t}</>;
    case "br":
      return <br />;
    case "strong":
      return <Strong token={token} />;
    case "codespan":
      if (token.text.startsWith("$$") && token.text.endsWith("$$")) {
        return <span className={classnames(styles.latex, styles.inline)}><InlineMath math={token.text.slice(2, -2)} /></span>
      }
      return (
        <code
          className={styles.codespan}
          dangerouslySetInnerHTML={{ __html: token.text }}
        ></code>
      );
    case "link":
      return <Link token={token} />;
    case "image":
      return <Image token={token} />;
    case "list":
      return <List token={token} />;
  }
  return null;
}

function CommonTokens({ tokens }: { tokens: marked.Token[] }) {
  return (
    <>
      {tokens.map((token, idx) => (
        <CommonToken key={idx} token={token} />
      ))}
    </>
  );
}

function Heading({ token }: { token: marked.Tokens.Heading }) {
  const Tag = `h${token.depth}` as "h1" | "h2" | "h3" | "h4";

  return (
    <Tag
      className={classnames({
        [styles.heading]: true,
        [styles.h1]: token.depth === 1,
        [styles.h2]: token.depth === 2,
        [styles.h3]: token.depth === 3,
      })}
    >
      {token.tokens.map((token, idx) => (
        <React.Fragment key={idx}>
          <CommonToken token={token} />
        </React.Fragment>
      ))}
    </Tag>
  );
}

function Paragraph({ token }: { token: marked.Tokens.Paragraph }) {
  return (
    <p className={styles.paragraph}>
      <CommonToken token={token} />
    </p>
  );
}

function List({ token }: { token: marked.Tokens.List }) {
  const Tag = token.ordered ? "ol" : "ul";

  return (
    <Tag className={styles.list}>
      {token.items.map((token, idx) => (
        <li key={idx}>
          <CommonToken token={token} />
        </li>
      ))}
    </Tag>
  );
}

function Strong({ token }: { token: marked.Tokens.Strong }) {
  return (
    <strong className={styles.strong}>
      <CommonTokens tokens={token.tokens} />
    </strong>
  );
}

function Link({ token }: { token: marked.Tokens.Link }) {
  return (
    <NextLink href={token.href} target="_blank" className={styles.link}>
      <CommonTokens tokens={token.tokens} />
    </NextLink>
  );
}

function Image({ token }: { token: marked.Tokens.Image }) {
  return (
    <span className={styles.imageContainer}>
      <NextImage
        className={styles.image}
        fill={true}
        src={token.href}
        alt={token.href}
      />
    </span>
  );
}

function WrapperSandpack({ entryKey }: { entryKey: string }) {
  const { codeDemoMap } = usePostContext();
  const codeDemo = codeDemoMap.get(entryKey);

  if (!codeDemo) {
    return null;
  }

  return (
    <div className={styles.wrapperSandpack}>
      <Sandpack
        theme={githubLight}
        template={codeDemo.template as any}
        files={Object.fromEntries(
          codeDemo.files.map((t) => [t.path, t.data] as const)
        )}
      />
    </div>
  );
}

function Code({ token }: { token: marked.Tokens.Code }) {
  if (token.lang === "yaml:stackblitz") {
    const obj = yaml.parse(token.text);
    return <Stackblitz {...obj} />;
  }
  if (token.lang === "yaml:codeDemo") {
    const { key } = yaml.parse(token.text);
    return <WrapperSandpack entryKey={key} />;
  }
  if (token.lang === "yaml:codeSandbox") {
    const { url, height } = yaml.parse(token.text);
    return (
      <iframe
        height={height}
        style={{ width: "100%" }}
        scrolling="no"
        title="React 16.4 Lifecycle Simple Demo"
        src={`${url}?theme-id=light&default-tab=js,result`}
        frameBorder="no"
        allowTransparency={true}
        allowFullScreen={true}
      ></iframe>
    );
  }
  if (token.lang === "math") {
    return <div className={classnames(styles.latex, styles.block)}><BlockMath math={token.text} /></div>
  }
  return <Highlighter language={token.lang ?? "js"}>{token.text}</Highlighter>;
}

function BlockQuote({ token }: { token: marked.Tokens.Blockquote }) {
  return (
    <div className={styles.blockQuote}>
      <CommonToken token={token} />
    </div>
  );
}

function TocItem({
  token,
  depth,
  active,
  nativeElement,
}: {
  token: marked.Tokens.Heading,
  depth: 1 | 2 | 3,
  active: boolean,
  nativeElement: Element | null
}) {
  const tocItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) {
      return;
    }
    const tocItemEl = tocItemRef.current;
    if (!tocItemEl) {
      return;
    }
    tocItemEl.scrollIntoView({
      block: 'center'
    })
  }, [active])

  return (
    <div
      ref={tocItemRef}
      className={classnames(styles[`tocH${depth}`], active && styles.tocItemActive)}
      onClick={() => {
        nativeElement?.scrollIntoView({ behavior: 'smooth' })
      }}>
      <CommonToken token={token} />
    </div>
  )
}

function Toc({
  tokens
}: {
  tokens: marked.TokensList
}) {
  const [effected, setEffected] = useState(false)
  const scrollTop = useGlobalScroll()
  const headings = useMemo(() => tokens.filter(token => token.type === 'heading' && token.depth <= 3).map(token => {
    if (token.type !== 'heading') {
      throw "Internal Error"
    }
    return {
      depth: token.depth as 1 | 2 | 3,
      token,
    }
  }), [tokens])

  const nativeElements = useMemo(() => {
    if (typeof document === 'undefined') {
      return [];
    }

    const els: Element[] = []
    for (const el of document.querySelectorAll(`.${styles.heading}`)) {
      if (["H1", "H2", "H3"].includes(el.tagName)) {
        els.push(el)
      }
    }
    return els
  }, [effected, headings, typeof document === 'undefined', typeof location !== 'undefined' && location.href])

  const activeIndex = useMemo(() => {
    const infos: Array<{ top: number, bottom: number }> = []
    for (const el of nativeElements) {
      const rect = el.getBoundingClientRect()
      infos.push({
        top: rect.top,
        bottom: rect.bottom,
      })
    }

    if (infos.length === 0) {
      return -1
    }
    if (infos[0].top >= 0) {
      return 0
    }
    for (let i = 1; i < infos.length; i++) {
      if (infos[i].top > 5) {
        return i - 1;
      }
    }
    return infos.length - 1
  }, [nativeElements, scrollTop])

  useEffect(() => {
    setEffected(true)
  }, [])

  // blue background height
  if (scrollTop < 330) {
    return null
  }

  return (
    <div className={classnames(styles.toc, styles.scroll)}>
      {headings.map((heading, index) => {
        return (
          <TocItem key={index} token={heading.token} depth={heading.depth} active={activeIndex === index} nativeElement={nativeElements[index] ?? null} />
        )
      })}
    </div>
  )
}

export function PostContentWidget() {
  const { tokens } = usePostContext();

  return (
    <div className={styles.post}>
      <Toc tokens={tokens} />
      {tokens.map((token, index) => (
        <React.Fragment key={index}>
          {(() => {
            switch (token.type) {
              case "heading":
                return <Heading token={token} />;
              case "paragraph":
                return <Paragraph token={token} />;
              case "list":
                return <List token={token} />;
              case "code":
                return <Code token={token} />;
              case "blockquote":
                return <BlockQuote token={token} />;
              default:
                return <CommonToken token={token} />;
            }
          })()}
        </React.Fragment>
      ))}
    </div>
  );
}
