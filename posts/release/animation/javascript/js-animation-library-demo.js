import React, { useEffect } from "react";
import sdk from "@stackblitz/sdk";

export function JsAnimiationLibraryDemo() {
  const ref = React.useRef();

  useEffect(() => {
    sdk.embedProjectId(ref.current, "typescript-pguhp7", {
      openFile: "index.ts",
      forceEmbedLayout: true,
    });
  }, []);

  return <div ref={ref} />;
}
