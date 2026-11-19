import type { AnalysisResult } from "@/lib/schemas";
import { sameAnswer } from "./answer";

/**
 * 정답 검증 루프 (AI 호출은 주입받아 테스트할 수 있게 한다)
 * 1. 문제마다 정답을 보여 주지 않고 독립적으로 다시 풀게 한다 (solve)
 * 2. 정답지와 같으면 확인 완료
 * 3. 다르면 두 풀이를 비교해 판정하게 한다 (adjudicate)
 *    - 정답지가 맞음 → 확인 완료
 *    - 정답지가 틀림 → 답·풀이를 고치고 표시
 *    - 판단 불가 → "검토 필요"
 */

export type VerifyTarget = { id: string; text: string; choices?: string[]; answer: string; solution: string };
export type Solved = { answer: string; solution: string };
export type Verdict =
  | { verdict: "key_correct" }
  | { verdict: "key_wrong"; answer: string; solution: string; note?: string }
  | { verdict: "unsure"; note?: string };

export type VerifyDeps = {
  solve: (target: Omit<VerifyTarget, "answer" | "solution">) => Promise<Solved>;
  adjudicate: (target: VerifyTarget, solved: Solved) => Promise<Verdict>;
  concurrency?: number;
};

export type Outcome =
  | { id: string; status: "ok" }
  | { id: string; status: "corrected"; answer: string; solution: string; note: string }
  | { id: string; status: "review"; note: string };

/** 검증할 문제: 원래 문제(O), 개념 예제(E), 쌍둥이(T1..), 확인 문제(C1..) */
export function verifyTargets(data: AnalysisResult): VerifyTarget[] {
  const pick = (id: string, p: { text: string; choices?: string[]; answer: string; solution: string }) =>
    ({ id, text: p.text, choices: p.choices, answer: p.answer, solution: p.solution });
  return [
    pick("O", data.original),
    pick("E", data.concept.example),
    ...data.twins.map((p, i) => pick(`T${i + 1}`, p)),
    ...data.checkProblems.map((p, i) => pick(`C${i + 1}`, p)),
  ];
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export async function checkOne(target: VerifyTarget, deps: VerifyDeps): Promise<Outcome> {
  try {
    const solved = await deps.solve({ id: target.id, text: target.text, choices: target.choices });
    if (sameAnswer(target.answer, solved.answer)) return { id: target.id, status: "ok" };

    const v = await deps.adjudicate(target, solved);
    if (v.verdict === "key_correct") return { id: target.id, status: "ok" };
    if (v.verdict === "key_wrong") {
      return {
        id: target.id,
        status: "corrected",
        answer: v.answer,
        solution: v.solution,
        note: v.note ?? `정답 검증에서 정답을 고쳤습니다 (처음 정답: ${target.answer}).`,
      };
    }
    return { id: target.id, status: "review", note: v.note ?? `다시 푼 답(${solved.answer})과 정답(${target.answer})이 달라 확인이 필요합니다.` };
  } catch {
    return { id: target.id, status: "review", note: "정답 검증 중 오류가 나서 확인하지 못했습니다." };
  }
}

type Patchable = { answer: string; solution: string; needsReview?: boolean; verifyNote?: string };

function applyOutcome<P extends Patchable>(p: P, o: Outcome | undefined): P {
  if (!o) return p;
  if (o.status === "ok") return { ...p, needsReview: undefined, verifyNote: undefined };
  if (o.status === "corrected") return { ...p, answer: o.answer, solution: o.solution, needsReview: undefined, verifyNote: o.note };
  return { ...p, needsReview: true, verifyNote: o.note };
}

export function applyOutcomes(data: AnalysisResult, outcomes: Outcome[], at = new Date().toISOString()): AnalysisResult {
  const byId = new Map(outcomes.map((o) => [o.id, o]));
  return {
    ...data,
    original: applyOutcome(data.original, byId.get("O")),
    concept: { ...data.concept, example: applyOutcome(data.concept.example, byId.get("E")) },
    twins: data.twins.map((p, i) => applyOutcome(p, byId.get(`T${i + 1}`))),
    checkProblems: data.checkProblems.map((p, i) => applyOutcome(p, byId.get(`C${i + 1}`))),
    verification: {
      checked: outcomes.length,
      corrected: outcomes.filter((o) => o.status === "corrected").length,
      review: outcomes.filter((o) => o.status === "review").length,
      at,
    },
  };
}

export async function verifyWorksheet(data: AnalysisResult, deps: VerifyDeps): Promise<AnalysisResult> {
  const outcomes = await mapLimit(verifyTargets(data), deps.concurrency ?? 4, (t) => checkOne(t, deps));
  return applyOutcomes(data, outcomes);
}
