import type { AnalysisResult } from "@/lib/schemas";
import { allPrerequisites, curriculum, followUps, getUnit, semesterLabel } from "@/lib/curriculum";
import type { ExportContext } from "./blocks";

export function exportContext(data: AnalysisResult, opts: { code?: string; includeAnswers: boolean }): ExportContext {
  const unit = getUnit(data.mapping.unitId);
  return {
    unitLabel: unit ? `${semesterLabel(unit.grade, unit.semester)} · ${unit.title} · ${data.mapping.subtopic}` : data.mapping.subtopic,
    code: opts.code,
    includeAnswers: opts.includeAnswers,
    units: curriculum.units,
    prerequisites: allPrerequisites(data.mapping.unitId),
    followUps: followUps(data.mapping.unitId),
  };
}

/** 오답훈련_일차방정식_20261120.docx */
export function exportFileName(data: AnalysisResult, ext: "docx" | "pdf", date = new Date()): string {
  const title = (getUnit(data.mapping.unitId)?.title ?? "학습지").replace(/[\\/:*?"<>|\s]+/g, "");
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  return `오답훈련_${title}_${ymd}.${ext}`;
}
