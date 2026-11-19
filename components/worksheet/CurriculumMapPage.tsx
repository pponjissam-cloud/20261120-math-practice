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

  const cardClass = (id: string) => {
    if (id === target) return "border-2 border-blue-700 bg-blue-600 text-white font-bold";
    if (prereqIds.has(id) || relatedIds.has(id)) return "border border-blue-300 bg-blue-100 text-blue-900";
    if (nextIds.has(id)) return "border border-emerald-300 bg-emerald-50 text-emerald-900";
    return "border border-slate-200 bg-white text-slate-500";
  };

  return (
    <PageShell title="중학교 수학 전체 과정에서의 위치" unitLabel={unitLabel} page={4}>
      <div className="mb-3 flex flex-wrap gap-3 text-xs">
        <span className="rounded bg-blue-600 px-2 py-0.5 text-white">이번 문제 단원</span>
        <span className="rounded border border-blue-300 bg-blue-100 px-2 py-0.5">먼저 알아야 할 단원</span>
        <span className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5">이어서 배울 단원</span>
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {SEMESTERS.map(({ grade, semester }) => (
          <div key={`${grade}-${semester}`}>
            <div className="mb-1.5 rounded bg-slate-800 py-1 text-center text-sm font-bold text-white">
              {semesterLabel(grade, semester)}
            </div>
            <div className="space-y-1.5">
              {unitsBySemester(grade, semester).map((u) => (
                <div key={u.id} className={`rounded px-1.5 py-2 text-center text-[11px] leading-tight ${cardClass(u.id)}`}>
                  {u.title}
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
          <div className="mb-2">
            <p className="font-semibold">이 단원을 위해 먼저 알아야 할 것</p>
            <ul className="list-disc pl-5">
              {prereqs.map((u) => (
                <li key={u.id}>{semesterLabel(u.grade, u.semester)} {u.title} — {u.subtopics.slice(0, 3).join(", ")}</li>
              ))}
            </ul>
          </div>
        )}
        {next.length > 0 && (
          <p><span className="font-semibold">이어서 배울 단원:</span> {next.map((u) => `${semesterLabel(u.grade, u.semester)} ${u.title}`).join(", ")}</p>
        )}
      </section>
      <p className="mt-4 text-[10px] text-slate-400">{curriculum.version} 개정 교육과정 기준 · {curriculum.note}</p>
    </PageShell>
  );
}
