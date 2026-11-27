import { useMemo } from "react";
import katex from "katex";

export default function Formula({
  expression,
  display,
}: {
  expression: string;
  display: boolean;
}) {
  const markup = useMemo(() => {
    try {
      // Only markup produced by KaTeX is inserted. Teacher and model input has no HTML privileges.
      return katex.renderToString(expression, {
        output: "mathml",
        displayMode: display,
        throwOnError: true,
        trust: false,
        maxSize: 12,
        maxExpand: 100,
      });
    } catch {
      return "";
    }
  }, [expression, display]);
  if (!markup) return <span className="formula-fallback">{expression}</span>;
  return (
    <span
      className={display ? "formula-block" : "formula-inline"}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
