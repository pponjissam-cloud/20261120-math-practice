import type { AnalysisResult, GradeItem, GradeResult, Problem } from "@/lib/schemas";

export type GradableProblem = { id: string; label: string; problem: Problem };

/** 학습지에서 학생이 푸는 문제(쌍둥이 + 개념 확인)를 채점 순서대로 나열한다. */
export function gradableProblems(data: AnalysisResult): GradableProblem[] {
  return [
    ...data.twins.map((problem, i) => ({ id: `T${i + 1}`, label: `쌍둥이 문제 ${i + 1}번`, problem })),
    ...data.checkProblems.map((problem, i) => ({ id: `C${i + 1}`, label: `개념 확인 문제 ${i + 1}번`, problem })),
  ];
}

export const STATUS_LABEL: Record<GradeItem["status"], string> = {
  correct: "맞음",
  partial: "부분 정답",
  wrong: "틀림",
  blank: "안 풂",
  not_found: "사진에 없음",
};

/** 점수는 AI에게 맡기지 않고 판정 결과로 직접 계산한다. 사진에 없는 문제는 분모에서 뺀다. */
export function scoreOf(result: GradeResult): { correct: number; partial: number; graded: number } {
  const graded = result.items.filter((i) => i.status !== "not_found");
  return {
    correct: graded.filter((i) => i.status === "correct").length,
    partial: graded.filter((i) => i.status === "partial").length,
    graded: graded.length,
  };
}
