import { z } from "zod";
import {
  AnalysisResultSchema, ProblemSchema, RecognizeResultSchema,
  type AnalysisResult, type Curriculum, type Problem, type RecognizeResult,
} from "@/lib/schemas";
import { curriculum, getUnit } from "@/lib/curriculum";
import { AiOutputError } from "./errors";

/** AI 인식 결과 검증. 빈 문제는 걸러 낸다. */
export function normalizeRecognition(raw: unknown): RecognizeResult {
  const parsed = RecognizeResultSchema.parse(raw);
  return { ...parsed, problems: parsed.problems.filter((p) => p.text.trim().length > 0) };
}

// ── 학습지는 여러 부분으로 나눠 만든다 ──

export const MapPartSchema = AnalysisResultSchema.pick({ original: true, mapping: true, errorPoint: true });
export const ProblemPartSchema = z.object({ problem: ProblemSchema });
export const ConceptPartSchema = AnalysisResultSchema.pick({ concept: true });

export type MapPart = z.infer<typeof MapPartSchema>;
export type ProblemPart = z.infer<typeof ProblemPartSchema>;
export type ConceptPart = z.infer<typeof ConceptPartSchema>;

/**
 * 단원 분석 결과를 검증하고 정리한다.
 * - 단원 id가 실제로 있는지 확인 (없으면 재시도 대상 오류)
 * - 사용자가 단원을 지정했으면 그 단원으로 고정하고 신뢰도 1
 * - 관련·후보 단원에서 없는 id와 중복 제거
 */
export function normalizeMap(raw: unknown, opts: { forcedUnitId?: string } = {}, data: Curriculum = curriculum): MapPart {
  const parsed = MapPartSchema.parse(raw);
  const unitId = opts.forcedUnitId ?? parsed.mapping.unitId;
  if (!getUnit(unitId, data)) throw new AiOutputError(`교육과정에 없는 단원 id: ${unitId}`);

  const exists = (id: string) => id !== unitId && !!getUnit(id, data);
  const candidates = opts.forcedUnitId ? undefined : parsed.mapping.candidates?.filter((c) => exists(c.unitId));

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

const ALIASES: Record<string, string[]> = {
  text: ["text", "question", "statement", "content", "body", "문제"],
  answer: ["answer", "correctAnswer", "correct_answer", "finalAnswer", "final_answer", "정답", "답"],
  solution: ["solution", "explanation", "steps", "solution_steps", "풀이", "해설"],
  choices: ["choices", "options", "보기"],
  difficulty: ["difficulty", "level", "난이도"],
};

/** 문제 객체의 칸 이름이 조금 달라도(question, 정답, explanation …) 정해진 이름으로 맞춘다. */
export function normalizeProblemKeys(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...o };
  for (const [key, names] of Object.entries(ALIASES)) {
    if (out[key] !== undefined && out[key] !== "") continue;
    const found = names.find((n) => o[n] !== undefined && o[n] !== "");
    if (found) out[key] = o[found];
  }
  return out;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/**
 * AI가 정해진 모양 {problem: {...}} 과 다르게 보낸 경우도 받아 준다.
 * - 문제 내용을 바로 보냄: {text, answer, ...}
 * - problem 칸에 JSON 글을 넣음
 * - problem 칸에 문제 글만 넣고 답·풀이는 바깥에 둠: {problem: "문제 글", answer, solution}
 * - 칸 이름이 다름: question, 정답, explanation …
 */
export function unwrapPart(part: string, raw: unknown): unknown {
  if (!isObj(raw)) return raw;
  if (part === "concept") {
    let c: unknown = raw.concept;
    if (typeof c === "string") {
      try { c = JSON.parse(c); } catch { /* 그대로 */ }
    }
    const concept = isObj(c) ? c : "title" in raw || "summary" in raw ? raw : undefined;
    if (!concept) return raw;
    return { concept: { ...concept, example: isObj(concept.example) ? normalizeProblemKeys(concept.example) : concept.example } };
  }

  let inner: unknown = raw.problem;
  if (typeof inner === "string") {
    try {
      inner = JSON.parse(inner);
    } catch {
      // JSON이 아닌 글이면 그것이 문제 글이고, 나머지 칸은 바깥에 있다
      const { problem: text, ...rest } = raw;
      return { problem: normalizeProblemKeys({ ...rest, text }) };
    }
  }
  if (isObj(inner)) return { problem: normalizeProblemKeys(inner) };
  return { problem: normalizeProblemKeys(raw) };
}

/** 나눠 만든 부분을 하나의 학습지로 합친다. (쌍둥이 2개, 확인 문제 3~5개 필요) */
export function assembleWorksheet(map: MapPart, twins: Problem[], concept: ConceptPart, checks: Problem[]): AnalysisResult {
  return AnalysisResultSchema.parse({ ...map, twins, ...concept, checkProblems: checks.slice(0, 5) });
}

/** 한 번에 받은 전체 분석 결과 검증(테스트·이전 데이터용) */
export function normalizeAnalysis(raw: unknown, opts: { forcedUnitId?: string } = {}, data: Curriculum = curriculum): AnalysisResult {
  const parsed = AnalysisResultSchema.parse(raw);
  return { ...parsed, ...normalizeMap(parsed, opts, data) };
}

/** 단원 확인을 사용자에게 물어야 하는 신뢰도 기준. */
export const LOW_CONFIDENCE = 0.6;
