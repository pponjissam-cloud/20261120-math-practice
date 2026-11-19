"use client";

import type { AnalysisResult, GradeItem, GradeResult } from "@/lib/schemas";
import { STATUS_LABEL, gradableProblems, scoreOf } from "@/lib/grade";
import { MathText } from "@/components/math/MathText";

const STATUS_STYLE: Record<GradeItem["status"], string> = {
  correct: "bg-emerald-100 text-emerald-800 border-emerald-300",
  partial: "bg-amber-100 text-amber-800 border-amber-300",
  wrong: "bg-rose-100 text-rose-800 border-rose-300",
  blank: "bg-slate-100 text-slate-600 border-slate-300",
  not_found: "bg-slate-100 text-slate-500 border-slate-300",
};
const STATUS_ICON: Record<GradeItem["status"], string> = { correct: "⭕", partial: "△", wrong: "❌", blank: "—", not_found: "?" };

/** 여러 줄 풀이: 줄마다 수식 렌더링 */
function Lines({ text }: { text: string }) {
  return (
    <div className="space-y-1 leading-relaxed">
      {text.split("\n").filter((l) => l.trim()).map((line, i) => <p key={i}><MathText text={line} /></p>)}
    </div>
  );
}

export function GradeReport({ worksheet, result, onRetryProblem, retryingId }: {
  worksheet: AnalysisResult;
  result: GradeResult;
  /** 틀린 문제로 새 쌍둥이 학습지를 만든다 */
  onRetryProblem?: (problemId: string) => void;
  retryingId?: string | null;
}) {
  const problems = new Map(gradableProblems(worksheet).map((p) => [p.id, p]));
  const score = scoreOf(result);

  return (
    <div className="space-y-5">
      <section className="avoid-break rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-3 flex items-baseline gap-3">
          <h2 className="text-xl font-bold">채점 결과</h2>
          <p className="text-2xl font-bold text-blue-700">{score.correct} / {score.graded}</p>
          {score.partial > 0 && <p className="text-sm text-amber-700">부분 정답 {score.partial}개</p>}
        </div>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {result.items.map((item) => (
            <a key={item.problemId} href={`#${item.problemId}`}
              className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLE[item.status]}`}>
              {STATUS_ICON[item.status]} {problems.get(item.problemId)?.label.replace(" 문제", "")}
            </a>
          ))}
        </div>
        <p className="mb-2 leading-relaxed">{result.summary}</p>
        <p className="rounded bg-blue-50 p-3 text-sm text-blue-900"><b>다음 공부:</b> {result.nextStep}</p>
        {result.photoNote && <p className="mt-2 rounded bg-amber-50 p-3 text-sm text-amber-800">📷 {result.photoNote}</p>}
      </section>

      {result.items.map((item) => {
        const p = problems.get(item.problemId);
        if (!p) return null;
        const missed = item.status === "wrong" || item.status === "partial" || item.status === "blank";
        return (
          <article key={item.problemId} id={item.problemId} className="avoid-break rounded-xl bg-white p-6 shadow-sm">
            <header className="mb-3 flex items-center gap-2">
              <h3 className="font-bold">{p.label}</h3>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                {STATUS_ICON[item.status]} {STATUS_LABEL[item.status]}
              </span>
            </header>

            <div className="mb-3 rounded bg-slate-50 p-3 text-sm"><MathText text={p.problem.text} /></div>

            <dl className="mb-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-slate-500">내 답</dt><dd className="font-semibold">{item.studentAnswer ? <MathText text={item.studentAnswer} /> : "—"}</dd></div>
              <div><dt className="text-slate-500">정답</dt><dd className="font-semibold"><MathText text={p.problem.answer} /></dd></div>
            </dl>

            <p className="mb-3">{item.feedback}</p>

            {item.studentWork && (
              <details className="mb-3 text-sm">
                <summary className="cursor-pointer text-slate-500">내 풀이 (사진에서 읽은 내용)</summary>
                <div className="mt-2 rounded border border-slate-200 p-3"><Lines text={item.studentWork} /></div>
              </details>
            )}

            {item.errorStep && (
              <div className="mb-3 rounded-lg border-2 border-rose-200 bg-rose-50 p-3 text-sm">
                <p className="mb-1 font-bold text-rose-900">🔍 여기서 틀렸어요</p>
                <Lines text={item.errorStep} />
              </div>
            )}

            <div className="mb-3 rounded-lg border-2 border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="mb-1 font-bold text-blue-900">📝 풀이 설명</p>
              <Lines text={item.explanation} />
            </div>

            {item.tip && <p className="text-sm text-slate-700">💡 <MathText text={item.tip} /></p>}

            {missed && onRetryProblem && (
              <button type="button" disabled={!!retryingId} onClick={() => onRetryProblem(item.problemId)}
                className="no-print mt-3 rounded border border-blue-600 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50">
                {retryingId === item.problemId ? "만드는 중…" : "이 문제로 새 쌍둥이 학습지 만들기"}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}
