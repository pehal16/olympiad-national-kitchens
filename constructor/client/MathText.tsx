import { Fragment, lazy, Suspense } from "react";
import "./math-text.css";

const Formula = lazy(() => import("./Formula"));
const formulas =
  /\\\(([\s\S]{1,900}?)\\\)|\\\[([\s\S]{1,900}?)\\\]|\$\$([\s\S]{1,900}?)\$\$|(?<![\\$])\$(?![\s$])([^\n$]{1,900}?)(?<!\s)\$(?![\d$])/gu;

export function MathText({ text }: { text?: string }) {
  if (!text || typeof text !== "string") return null;
  const matches = [...text.matchAll(formulas)].slice(0, 60);
  if (!matches.length) return text;
  let position = 0;
  return (
    <>
      {matches.map((match) => {
        const preceding = text.slice(position, match.index);
        position = match.index + match[0].length;
        const expression = match[1] || match[2] || match[3] || match[4];
        return (
          <Fragment key={match.index}>
            {preceding}
            <Suspense fallback={match[0]}>
              <Formula
                expression={expression}
                display={Boolean(match[2] || match[3])}
              />
            </Suspense>
          </Fragment>
        );
      })}
      {text.slice(position)}
    </>
  );
}
