import type { AnalysisResult } from "@/lib/schemas";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { TwinPage } from "./TwinPage";
import { ConceptPage } from "./ConceptPage";
import { CheckPage } from "./CheckPage";
import { CurriculumMapPage } from "./CurriculumMapPage";
import { AnswerPage } from "./AnswerPage";

/** code: 학습지 코드. 페이지 머리에 인쇄되어, 푼 뒤 채점할 때 이 학습지를 찾는 데 쓴다. */
export function Worksheet({ data, includeAnswers, code }: { data: AnalysisResult; includeAnswers: boolean; code?: string }) {
  const unit = getUnit(data.mapping.unitId);
  const base = unit ? `${semesterLabel(unit.grade, unit.semester)} · ${unit.title} · ${data.mapping.subtopic}` : data.mapping.subtopic;
  const unitLabel = code ? `${base} · 학습지 코드 ${code}` : base;
  return (
    <div className="worksheet">
      <TwinPage data={data} unitLabel={unitLabel} />
      <ConceptPage data={data} unitLabel={unitLabel} />
      <CheckPage data={data} unitLabel={unitLabel} />
      <CurriculumMapPage data={data} unitLabel={unitLabel} />
      {includeAnswers && <AnswerPage data={data} unitLabel={unitLabel} />}
    </div>
  );
}
