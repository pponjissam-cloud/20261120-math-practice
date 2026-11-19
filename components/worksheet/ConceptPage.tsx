import type { AnalysisResult } from "@/lib/schemas";
import { MathText } from "@/components/math/MathText";
import { PageShell } from "./PageShell";

export function ConceptPage({ data, unitLabel }: { data: AnalysisResult; unitLabel: string }) {
  const { concept } = data;
  return (
    <PageShell title={`관련 개념 이해 — ${concept.title}`} unitLabel={unitLabel} page={2}>
      <section className="mb-5">
        <h3 className="mb-2 font-bold">📘 핵심 개념</h3>
        <p className="leading-relaxed"><MathText text={concept.summary} /></p>
      </section>

      <section className="mb-5 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
        <h3 className="mb-2 font-bold text-blue-900">📐 꼭 기억할 공식·규칙</h3>
        <ul className="list-disc space-y-1 pl-5">
          {concept.keyFormulas.map((f, i) => <li key={i}><MathText text={f} /></li>)}
        </ul>
      </section>

      <section className="mb-5 rounded-lg border-2 border-rose-300 bg-rose-50 p-4">
        <h3 className="mb-2 font-bold text-rose-900">⚠️ 이 문제에서 틀리기 쉬운 지점</h3>
        <p className="mb-2 text-sm"><MathText text={data.errorPoint} /></p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {concept.commonMistakes.map((m, i) => <li key={i}><MathText text={m} /></li>)}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-300 p-4">
        <h3 className="mb-2 font-bold">✏️ 예제</h3>
        <p className="mb-2"><MathText text={concept.example.text} /></p>
        <p className="text-sm text-slate-700"><span className="font-semibold">풀이</span> <MathText text={concept.example.solution} /></p>
        <p className="mt-1 text-sm font-semibold">답: <MathText text={concept.example.answer} /></p>
      </section>
    </PageShell>
  );
}
