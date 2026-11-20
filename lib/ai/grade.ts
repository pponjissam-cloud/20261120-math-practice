import { z } from "zod";
import { GradeItemSchema, GradeResultSchema, type AnalysisResult, type GradeItem, type GradeResult } from "@/lib/schemas";
import { gradableProblems } from "@/lib/grade";

export const GradeItemsPartSchema = z.object({ items: z.array(GradeItemSchema), photoNote: z.string().optional() });
export const GradeSummarySchema = z.object({ summary: z.string(), nextStep: z.string() });
export type GradeItemsPart = z.infer<typeof GradeItemsPartSchema>;

/** 일부 문제 채점 결과: 요청한 문제만 남기고, 빠진 문제는 '사진에 없음'으로 채운다. */
export function normalizeGradeItems(raw: unknown, data: AnalysisResult, onlyIds: string[]): GradeItemsPart {
  const parsed = GradeItemsPartSchema.parse(raw);
  const byId = new Map<string, GradeItem>();
  for (const item of parsed.items) if (onlyIds.includes(item.problemId) && !byId.has(item.problemId)) byId.set(item.problemId, item);
  const items = gradableProblems(data)
    .filter((p) => onlyIds.includes(p.id))
    .map(({ id, problem }) => byId.get(id) ?? notFound(id, problem.solution));
  return { items, photoNote: parsed.photoNote };
}

function notFound(problemId: string, solution: string): GradeItem {
  return {
    problemId,
    status: "not_found",
    feedback: "사진에서 이 문제의 풀이를 찾지 못했어요. 이 문제가 보이게 다시 찍어 올려 주세요.",
    explanation: solution,
  };
}

/**
 * 채점 결과를 검증하고 학습지 문제 목록에 맞춰 정리한다.
 * - 목록에 없는 problemId와 중복은 버린다
 * - 빠진 문제는 "사진에 없음"으로 채우고 정답지 풀이를 설명으로 넣는다
 * - 학습지 문제 순서대로 정렬한다
 */
export function normalizeGrade(raw: unknown, data: AnalysisResult): GradeResult {
  const parsed = GradeResultSchema.parse(raw);
  const byId = new Map<string, GradeItem>();
  for (const item of parsed.items) if (!byId.has(item.problemId)) byId.set(item.problemId, item);
  const items = gradableProblems(data).map(({ id, problem }) => byId.get(id) ?? notFound(id, problem.solution));
  return { ...parsed, items };
}
