import { marked } from "marked";
import React from "react";
import NextLink from "next/link";
import NextImage from "next/image";
import styles from "./post.module.scss";
import classnames from "classnames";
import { Highlighter } from "./code.widget";

export interface PostContentWidgetProps {
  tokens: marked.TokensList;
}

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
      return <>{token.text}</>;
    case "strong":
      return <Strong token={token} />;
    case "codespan":
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
  const Tag = `h${token.depth}` as "h2" | "h3" | "h4";

  return (
    <Tag
      className={classnames({
        [styles.heading]: true,
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
    <NextLink href={token.href} target="_blank">
      <CommonTokens tokens={token.tokens} />
    </NextLink>
  );
}

function Image({ token }: { token: marked.Tokens.Image }) {
  return <img width={600} src={token.href} alt={token.title} />;
}

function Code({ token }: { token: marked.Tokens.Code }) {
  return <Highlighter language={token.lang ?? "js"}>{token.text}</Highlighter>;
}

export function PostContentWidget({ tokens }: PostContentWidgetProps) {
  return (
    <div className={styles.post}>
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
              default:
                return <CommonToken token={token} />;
            }
          })()}
        </React.Fragment>
      ))}
    </div>
  );
}
