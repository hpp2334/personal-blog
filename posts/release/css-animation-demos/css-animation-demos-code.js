import { createPreBindedCodePresetFull } from "@components/keekijanai";

const requireRaw = require.context("!raw-loader!./demos", true, /\.(js|css|scss|html)/);

const requireDemo = require.context("./demos", true, /\.(js)/);

export const CodeCSSAnimationDemo = createPreBindedCodePresetFull(requireDemo, requireRaw);
