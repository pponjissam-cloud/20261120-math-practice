import type { AnalysisResult } from "@/lib/schemas";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { TwinPage } from "./TwinPage";
import { ConceptPage } from "./ConceptPage";
import { CheckPage } from "./CheckPage";
import { CurriculumMapPage } from "./CurriculumMapPage";
import { AnswerPage } from "./AnswerPage";

export function Worksheet({ data, includeAnswers }: { data: AnalysisResult; includeAnswers: boolean }) {
  const unit = getUnit(data.mapping.unitId);
  const unitLabel = unit ? `${semesterLabel(unit.grade, unit.semester)} · ${unit.title} · ${data.mapping.subtopic}` : data.mapping.subtopic;
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
