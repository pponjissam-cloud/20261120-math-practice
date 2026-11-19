import { AnalysisResultSchema, RecognizeResultSchema, type AnalysisResult, type Curriculum, type RecognizeResult } from "@/lib/schemas";
import { curriculum, getUnit } from "@/lib/curriculum";
import { AiOutputError } from "./errors";

/** AI 인식 결과 검증. 빈 문제는 걸러 낸다. */
export function normalizeRecognition(raw: unknown): RecognizeResult {
  const parsed = RecognizeResultSchema.parse(raw);
  return { ...parsed, problems: parsed.problems.filter((p) => p.text.trim().length > 0) };
}

/**
 * AI 분석 결과를 검증하고 정리한다.
 * - 단원 id가 실제로 있는지 확인 (없으면 재시도 대상 오류)
 * - 사용자가 단원을 지정했으면 그 단원으로 고정하고 신뢰도 1
 * - 관련·후보 단원에서 없는 id와 중복 제거
 */
export function normalizeAnalysis(raw: unknown, opts: { forcedUnitId?: string } = {}, data: Curriculum = curriculum): AnalysisResult {
  const parsed = AnalysisResultSchema.parse(raw);
  const unitId = opts.forcedUnitId ?? parsed.mapping.unitId;
  if (!getUnit(unitId, data)) throw new AiOutputError(`교육과정에 없는 단원 id: ${unitId}`);

  const exists = (id: string) => id !== unitId && !!getUnit(id, data);
  const candidates = opts.forcedUnitId
    ? undefined
    : parsed.mapping.candidates?.filter((c) => exists(c.unitId));

  return {
    ...parsed,
    mapping: {
      ...parsed.mapping,
      unitId,
      confidence: opts.forcedUnitId ? 1 : parsed.mapping.confidence,
      relatedUnitIds: [...new Set(parsed.mapping.relatedUnitIds.filter(exists))],
      candidates: candidates?.length ? candidates : undefined,
    },
  };
}

/** 단원 확인을 사용자에게 물어야 하는 신뢰도 기준. */
export const LOW_CONFIDENCE = 0.6;
