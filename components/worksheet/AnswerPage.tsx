import type { AnalysisResult, Problem } from "@/lib/schemas";
import { MathText } from "@/components/math/MathText";
import { PageShell } from "./PageShell";

type AnswerLike = Pick<Problem, "answer" | "solution" | "needsReview" | "verifyNote">;

function AnswerItem({ label, p }: { label: string; p: AnswerLike }) {
  return (
    <li className="avoid-break mb-2">
      <span className="font-semibold">{label}</span> 답: <MathText text={p.answer} />
      {p.needsReview && <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-800">⚠ 정답 확인 필요</span>}
      <div className="pl-4 text-slate-600"><MathText text={p.solution} /></div>
      {p.verifyNote && <div className="no-print pl-4 text-xs text-amber-700">{p.verifyNote}</div>}
    </li>
  );
}

export function AnswerPage({ data, unitLabel }: { data: AnalysisResult; unitLabel: string }) {
  return (
    <PageShell title="정답 및 해설" unitLabel={unitLabel} page={5}>
      <h3 className="mb-2 font-bold">틀린 문제</h3>
      <ul className="mb-4 text-sm"><AnswerItem label="원래 문제" p={data.original} /></ul>
      <h3 className="mb-2 font-bold">쌍둥이 문제</h3>
      <ul className="mb-4 text-sm">{data.twins.map((p, i) => <AnswerItem key={i} label={`${i + 1}.`} p={p} />)}</ul>
      <h3 className="mb-2 font-bold">개념 확인 문제</h3>
      <ul className="text-sm">{data.checkProblems.map((p, i) => <AnswerItem key={i} label={`${i + 1}.`} p={p} />)}</ul>
    </PageShell>
  );
}
