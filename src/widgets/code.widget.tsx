import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import oneLight from "react-syntax-highlighter/dist/cjs/styles/prism/one-light";
import js from "react-syntax-highlighter/dist/cjs/languages/prism/javascript";
import ts from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import json from "react-syntax-highlighter/dist/cjs/languages/prism/json";
import cpp from "react-syntax-highlighter/dist/cjs/languages/prism/cpp";
import rust from "react-syntax-highlighter/dist/cjs/languages/prism/rust";

SyntaxHighlighter.registerLanguage("js", js);
SyntaxHighlighter.registerLanguage("jsx", js);
SyntaxHighlighter.registerLanguage("ts", ts);
SyntaxHighlighter.registerLanguage("tsx", ts);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("rust", rust);

export function Highlighter({
  language,
  children,
}: {
  language: string;
  children: string;
}) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneLight}
      showLineNumbers
      customStyle={{ fontSize: 12 }}
    >
      {children}
    </SyntaxHighlighter>
  );
}
