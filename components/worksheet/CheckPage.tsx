import type { AnalysisResult } from "@/lib/schemas";
import { PageShell } from "./PageShell";
import { ProblemBlock } from "./ProblemBlock";

export function CheckPage({ data, unitLabel }: { data: AnalysisResult; unitLabel: string }) {
  // 문제 수에 따라 풀이 칸 높이를 조절해 A4 한 장에 맞춘다.
  const workSpace = data.checkProblems.length >= 5 ? 28 : data.checkProblems.length === 4 ? 36 : 50;
  return (
    <PageShell title="개념 확인 문제" unitLabel={unitLabel} page={3}>
      <p className="mb-4 text-sm text-slate-600">쉬운 문제부터 차례로 풀며 개념을 정확히 알고 있는지 확인하세요.</p>
      {data.checkProblems.map((p, i) => (
        <ProblemBlock key={i} no={i + 1} problem={p} workSpace={workSpace} />
      ))}
    </PageShell>
  );
}
