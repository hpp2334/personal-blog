import { useEffect, useRef } from "react";
import sdk from "@stackblitz/sdk";

export function Stackblitz({ id, openFile }: { id: string; openFile: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !ref.current.parentNode) {
      return;
    }
    sdk.embedProjectId(ref.current, id, {
      openFile,
      forceEmbedLayout: true,
    });
  }, [ref, id, openFile]);

  return <div ref={ref} />;
}
