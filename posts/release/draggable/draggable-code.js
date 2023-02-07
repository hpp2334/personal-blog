import { createPreBindedCodePresetFull } from "@components/keekijanai";

const requireRaw = require.context("!raw-loader!./demo", true, /\.(js|css|html)/);

const requireDemo = require.context("./demo", true, /\.(js)/);

export const CodeDraggable = createPreBindedCodePresetFull(requireDemo, requireRaw);
