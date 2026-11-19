import katex from "katex";

type Segment = { kind: "text" | "inline" | "block"; value: string };

/** "$...$"(인라인)와 "$$...$$"(블록)가 섞인 문자열을 조각으로 나눈다. "\$"는 리터럴 달러. */
export function splitMath(input: string): Segment[] {
  const segments: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|(?<!\\)\$([^$]+?)(?<!\\)\$/g;
  let last = 0;
  for (const m of input.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) segments.push({ kind: "text", value: input.slice(last, idx) });
    if (m[1] !== undefined) segments.push({ kind: "block", value: m[1] });
    else segments.push({ kind: "inline", value: m[2] });
    last = idx + m[0].length;
  }
  if (last < input.length) segments.push({ kind: "text", value: input.slice(last) });
  return segments.map((s) => (s.kind === "text" ? { ...s, value: s.value.replace(/\\\$/g, "$") } : s));
}

export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {splitMath(text).map((seg, i) => {
        if (seg.kind === "text") return <span key={i}>{seg.value}</span>;
        const html = katex.renderToString(seg.value, {
          displayMode: seg.kind === "block",
          throwOnError: false,
          strict: "ignore",
        });
        return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
      })}
    </span>
  );
}
