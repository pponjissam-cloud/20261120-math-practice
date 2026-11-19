import type { Problem } from "@/lib/schemas";
import { MathText } from "@/components/math/MathText";
import { FigureRenderer } from "@/components/figure/FigureRenderer";

const CIRCLED = ["①", "②", "③", "④", "⑤"];
const STARS = { 1: "★☆☆", 2: "★★☆", 3: "★★★" } as const;

/** 문제 한 개 + 풀이 공간. workSpace는 풀이 칸 높이(mm). */
export function ProblemBlock({ no, problem, workSpace = 60 }: { no: number; problem: Problem; workSpace?: number }) {
  return (
    <article className="avoid-break mb-6">
      <div className="mb-2 flex items-start gap-2">
        <span className="shrink-0 font-bold">{no}.</span>
        <div className="flex-1 leading-relaxed">
          <MathText text={problem.text} />
          {problem.needsReview && (
            <span className="no-print ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">⚠ 검토 필요</span>
          )}
        </div>
        <span className="shrink-0 text-xs text-slate-400">{STARS[problem.difficulty]}</span>
      </div>
      {problem.figure && <FigureRenderer spec={problem.figure} />}
      {problem.choices && (
        <ol className="ml-6 grid grid-cols-5 gap-2 text-sm">
          {problem.choices.map((c, i) => (
            <li key={i}>{CIRCLED[i]} <MathText text={c} /></li>
          ))}
        </ol>
      )}
      <div className="ml-6 mt-2 rounded border border-dashed border-slate-300" style={{ height: `${workSpace}mm` }} aria-label="풀이 공간" />
    </article>
  );
}
