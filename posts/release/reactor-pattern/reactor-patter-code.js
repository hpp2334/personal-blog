import React from "react";
import { Code, CodeSources } from "@components/keekijanai";

const requireRaw = require.context("!raw-loader!./codes", true, /\.(mjs|rs)/);

export const ReactorPatternTcpEchoServerCode = () => (
  <Code>
    <CodeSources getSource={requireRaw} sourceKeyList={["./tcp-server.rs", "./tcp-client.mjs"]} />
  </Code>
);
