import type { AnalysisResult } from "@/lib/schemas";
import { SEMESTERS, allPrerequisites, curriculum, followUps, semesterLabel, unitsBySemester } from "@/lib/curriculum";
import { PageShell } from "./PageShell";

export function CurriculumMapPage({ data, unitLabel }: { data: AnalysisResult; unitLabel: string }) {
  const target = data.mapping.unitId;
  const prereqs = allPrerequisites(target);
  const prereqIds = new Set(prereqs.map((u) => u.id));
  const relatedIds = new Set(data.mapping.relatedUnitIds);
  const next = followUps(target);
  const nextIds = new Set(next.map((u) => u.id));

  // 색: 이번 단원 = 파랑, 먼저 알아야 할 단원 = 주황, 이어서 배울 단원 = 초록
  // 흑백 인쇄에서도 구분되도록 ★ ◆ ▷ 표시를 함께 붙인다
  const kind = (id: string): "target" | "pre" | "next" | "other" =>
    id === target ? "target" : prereqIds.has(id) || relatedIds.has(id) ? "pre" : nextIds.has(id) ? "next" : "other";
  const CARD = {
    target: "border-2 border-blue-800 bg-blue-600 text-white font-bold",
    pre: "border-2 border-orange-400 bg-orange-100 text-orange-900 font-semibold",
    next: "border-2 border-emerald-500 bg-emerald-100 text-emerald-900 font-semibold",
    other: "border border-slate-200 bg-white text-slate-500",
  } as const;
  const MARK = { target: "★ ", pre: "◆ ", next: "▷ ", other: "" } as const;

  return (
    <PageShell title="중학교 수학 전체 과정에서의 위치" unitLabel={unitLabel} page={4}>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <span className={`rounded px-2 py-0.5 ${CARD.target}`}>★ 이번 문제 단원</span>
        <span className={`rounded px-2 py-0.5 ${CARD.pre}`}>◆ 먼저 알아야 할 단원</span>
        <span className={`rounded px-2 py-0.5 ${CARD.next}`}>▷ 이어서 배울 단원</span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {SEMESTERS.map(({ grade, semester }) => (
          <div key={`${grade}-${semester}`}>
            <div className="mb-1.5 rounded bg-slate-800 py-1 text-center text-sm font-bold text-white">
              {semesterLabel(grade, semester)}
            </div>
            <div className="space-y-1.5">
              {unitsBySemester(grade, semester).map((u) => (
                <div key={u.id} className={`rounded px-1.5 py-2 text-center text-[11px] leading-tight ${CARD[kind(u.id)]}`}>
                  {MARK[kind(u.id)]}{u.title}
                  {u.id === target && <div className="mt-1 text-[10px] font-normal">({data.mapping.subtopic})</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6 text-sm">
        <p className="mb-2"><span className="font-semibold">분석 근거:</span> {data.mapping.reason}</p>
        {prereqs.length > 0 && (
          <div className="mb-2 rounded-lg border-l-4 border-orange-400 bg-orange-50 p-3">
            <p className="font-semibold text-orange-900">◆ 이 단원을 위해 먼저 알아야 할 것</p>
            <ul className="list-disc pl-5 text-orange-950">
              {prereqs.map((u) => (
                <li key={u.id}>{semesterLabel(u.grade, u.semester)} {u.title} — {u.subtopics.slice(0, 3).join(", ")}</li>
              ))}
            </ul>
          </div>
        )}
        {next.length > 0 && (
          <div className="rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-3">
            <p className="font-semibold text-emerald-900">▷ 이어서 배울 단원</p>
            <p className="text-emerald-950">{next.map((u) => `${semesterLabel(u.grade, u.semester)} ${u.title}`).join(", ")}</p>
          </div>
        )}
      </section>
      <p className="mt-4 text-[10px] text-slate-400">{curriculum.version} 개정 교육과정 기준 · {curriculum.note}</p>
    </PageShell>
  );
}
