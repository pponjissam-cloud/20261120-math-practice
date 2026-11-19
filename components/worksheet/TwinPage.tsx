import type { AnalysisResult } from "@/lib/schemas";
import { MathText } from "@/components/math/MathText";
import { PageShell } from "./PageShell";
import { ProblemBlock } from "./ProblemBlock";

export function TwinPage({ data, unitLabel }: { data: AnalysisResult; unitLabel: string }) {
  return (
    <PageShell title="쌍둥이 문제" unitLabel={unitLabel} page={1}>
      <div className="mb-6 rounded bg-slate-50 p-3 text-sm">
        <p className="mb-1 font-semibold text-slate-600">틀린 문제</p>
        <MathText text={data.original.text} />
      </div>
      <p className="mb-4 text-sm text-slate-600">틀린 문제와 같은 개념으로 풀리는 문제입니다. 풀이 과정을 꼭 써 보세요.</p>
      {data.twins.map((p, i) => (
        <ProblemBlock key={i} no={i + 1} problem={p} workSpace={75} />
      ))}
    </PageShell>
  );
}
