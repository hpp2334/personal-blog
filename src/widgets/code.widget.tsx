import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import oneLight from "react-syntax-highlighter/dist/cjs/styles/prism/one-light";
import js from "react-syntax-highlighter/dist/cjs/languages/prism/javascript";
import ts from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import cpp from "react-syntax-highlighter/dist/cjs/languages/prism/cpp";
import rust from "react-syntax-highlighter/dist/cjs/languages/prism/rust";
import styles from "./code.module.scss";

SyntaxHighlighter.registerLanguage("js", js);
SyntaxHighlighter.registerLanguage("jsx", js);
SyntaxHighlighter.registerLanguage("ts", ts);
SyntaxHighlighter.registerLanguage("tsx", ts);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("rust", rust);

const LanguageFormatMappings: Array<string[]> = [
  ["Rust", "rust"],
  ["C++", "cpp"],
  ["JavaScript", "javascript", "js"],
  ["TypeScript", "typescript", "ts"],
  ["JSX", "jsx"],
  ["TSX", "tsx"],
  ["JSON", "json"],
];

function formatLanguage(lang: string) {
  const formated = LanguageFormatMappings.find((m) =>
    m.slice(1).find((t) => t === lang.toLowerCase())
  )?.[0];
  return formated ?? lang;
}

export function Highlighter({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  return (
    <div className={styles.codeContainer}>
      <div className={styles.codeTag}>{formatLanguage(language)}</div>
      <SyntaxHighlighter
        language={language}
        style={oneLight}
        showLineNumbers
        customStyle={{ fontSize: 12 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
