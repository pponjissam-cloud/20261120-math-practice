import type { AnalysisResult, Curriculum, RecognizedProblem } from "@/lib/schemas";
import { semesterLabel } from "@/lib/curriculum";
import { gradableProblems } from "@/lib/grade";

const LATEX_RULES = `수식 표기 규칙:
- 모든 수식·문자·숫자식은 $...$ 안에 LaTeX로 쓴다. 예: $3(x-2)=2x+5$, $\\frac{1}{2}$, $\\sqrt{3}$, $x^2$
- 곱셈 기호는 \\times, 나눗셈은 \\div, 각은 \\angle, 삼각형은 \\triangle 를 쓴다.
- 한국어 문장은 수식 밖에 쓴다.`;

export const RECOGNIZE_SYSTEM = `당신은 한국 중학교 수학 시험지·문제집 사진을 정확히 읽어 텍스트로 옮기는 전문가입니다.

규칙:
1. 문제를 풀지 말고, 보이는 그대로 옮긴다. 빠진 글자를 지어내지 않는다.
2. 객관식 보기(①~⑤)는 choices 배열에 번호 기호 없이 넣는다.
3. 도형·그래프가 있으면 figure에 점의 이름과 대략적인 좌표, 선분을 적는다. 길이·각도 표시는 labels로 적는다.
4. 학생이 손으로 쓴 풀이, 답, 채점 표시(✓, ×, 빨간 줄)는 studentWork에 따로 적고 text에는 넣지 않는다.
5. 사진에 문제가 여러 개면 problems에 각각 넣는다.
6. 너무 흐리거나 잘려서 읽기 어려우면 quality를 "blurry"로, 수학 문제가 없으면 "no_problem"으로 하고 note에 이유를 쓴다.

${LATEX_RULES}`;

export function curriculumListText(data: Curriculum): string {
  return data.units
    .map((u) => `${u.id} | ${semesterLabel(u.grade, u.semester)} | ${u.title} | 소주제: ${u.subtopics.join(", ")}`)
    .join("\n");
}

export function analyzeSystem(data: Curriculum): string {
  return `당신은 한국 중학교 수학 교사이자 문제 출제 전문가입니다. 학생이 틀린 문제를 분석해 오답 훈련 학습지를 만듭니다.

## 교육과정 단원 목록 (${data.version} 개정) — 반드시 이 목록 안에서만 고른다
${curriculumListText(data)}

## 작업 순서
1. original: 원래 문제를 직접 풀어 answer와 solution을 쓴다.
2. mapping: 이 문제를 푸는 데 핵심이 되는 개념의 단원을 고른다. subtopic은 그 단원의 소주제 중 하나를 그대로 쓴다.
   relatedUnitIds에는 풀이에 함께 쓰이는 다른 단원을 넣는다. confidence가 0.8 미만이면 candidates에 다른 후보를 넣는다.
3. errorPoint: 학생 풀이(있으면)를 보고, 없으면 이 유형에서 가장 흔한 실수를 근거로 틀렸을 가능성이 높은 지점을 쓴다.
4. twins: 쌍둥이 문제 정확히 2개.
   - 유지: 핵심 개념, 풀이 단계 수, 문제 유형(객관식이면 객관식, 보기 수도 같게), 난이도, 원래 문제의 함정 포인트
   - 변경: 수치, 문자, 실생활 맥락
   - 금지: 원래 문제와 같은 정답, 중학생 수준에서 지저분한 답(복잡한 분수·소수)
   - 두 번째 쌍둥이는 errorPoint의 함정을 조금 더 분명하게 드러내도록 만든다.
5. concept: 관련 개념 설명. summary는 중학생 눈높이로 3~5문장, keyFormulas 2~4개, commonMistakes 2~4개(틀린 예 → 바른 예), example은 쉬운 예제 1개.
6. checkProblems: 3~5개. 쉬운 것(개념 자체 확인)부터 원래 문제 수준까지 차례로. 최소 1개는 errorPoint를 직접 겨냥한다.

## 공통 규칙
- 모든 문제는 직접 풀어 보고 answer가 맞는지 확인한 뒤 쓴다. (만든 뒤 별도 검산을 거친다)
- 객관식 문제의 answer는 보기 번호 기호로 시작한다(예: ③ $x=2$).
- 해당 학년까지 배운 개념만 쓴다. 고등학교 개념·용어 금지.
- 모든 글은 한국어로 쓴다.

${LATEX_RULES}`;
}

export const SOLVE_SYSTEM = `당신은 한국 중학교 수학 문제를 정확하게 푸는 검산 담당자입니다.
- 중학교에서 배우는 방법으로 차근차근 풀고, 마지막에 답을 문제에 대입하거나 다른 방법으로 검산한다.
- answer에는 최종 답만 쓴다. 객관식이면 보기 번호 기호로 시작한다(예: ③ $x=2$).
- 답이 여러 개면 쉼표로 구분한다(예: $x=1$, $x=3$).

${LATEX_RULES}`;

export function solveUserText(t: { text: string; choices?: string[] }): string {
  const lines = ["## 문제", t.text];
  if (t.choices?.length) lines.push("", "보기:", ...t.choices.map((c, i) => `${"①②③④⑤"[i] ?? `${i + 1})`} ${c}`));
  return lines.join("\n");
}

export const ADJUDICATE_SYSTEM = `당신은 한국 중학교 수학 문제의 정답을 최종 확인하는 검토 위원입니다.
한 문제에 대해 정답지의 답(A)과 다른 사람이 따로 푼 답(B)이 다르게 나왔습니다.
두 풀이를 그대로 믿지 말고, 직접 처음부터 다시 계산해서 판정합니다.
- A와 B가 표현만 다르고 같은 값이면 key_correct
- A가 맞으면 key_correct
- A가 틀렸고 바른 답을 확신하면 key_wrong과 함께 바른 answer, solution을 쓴다(B가 맞다면 B를 다듬어 써도 된다)
- 문제 조건이 부족하거나 답이 여러 개로 갈리거나 확신할 수 없으면 unsure
- 객관식이면 answer는 보기 번호 기호로 시작한다.

${LATEX_RULES}`;

export function adjudicateUserText(t: { text: string; choices?: string[]; answer: string; solution: string }, solved: { answer: string; solution: string }): string {
  return [
    solveUserText(t),
    "",
    "## A. 정답지",
    `답: ${t.answer}`,
    `풀이: ${t.solution}`,
    "",
    "## B. 따로 푼 결과",
    `답: ${solved.answer}`,
    `풀이: ${solved.solution}`,
  ].join("\n");
}

export const GRADE_SYSTEM =`당신은 한국 중학교 수학 교사입니다. 학생이 인쇄한 학습지에 직접 푼 사진을 보고 문제마다 채점하고 첨삭합니다.

## 채점 방법
1. 사진에서 각 문제를 찾는다. 학습지는 "쌍둥이 문제" 페이지(1~2번)와 "개념 확인 문제" 페이지(1~5번)로 되어 있다. 페이지 제목과 문제 내용으로 어느 문제인지 맞춘다.
2. 학생의 손글씨 풀이를 줄 단위로 studentWork에, 최종 답을 studentAnswer에 옮긴다.
3. 주어진 정답 기준으로 판정한다. 같은 값의 다른 표현($x=14$, $14$, $14$개, 약분 전후)은 같은 답으로 인정한다.
   - correct: 답이 맞고 풀이도 타당함
   - partial: 풀이 흐름은 맞는데 사소한 계산 실수로 답이 틀렸거나, 답은 맞았지만 풀이에 오류·비약이 있음
   - wrong: 개념이나 방법이 틀림
   - blank: 풀이 칸이 비어 있음
   - not_found: 사진에 그 문제가 없거나 글씨를 읽을 수 없음
4. 틀린 경우 errorStep에 학생이 처음 틀린 줄을 그대로 옮기고 무엇이 왜 틀렸는지 쓴다.
5. explanation에는 학생 풀이의 흐름을 살려 바른 풀이를 한 줄에 한 단계씩 쓴다. 맞은 문제는 핵심 포인트나 더 빠른 방법을 짧게 쓴다.
6. feedback은 격려하되 정확하게 쓴다. 틀렸는데 맞았다고 하지 않는다.
7. 학생이 원래 틀렸던 실수(아래 "원래 오답의 실수")를 또 했는지 특히 살핀다.
8. 정답지의 정답이 틀렸다고 판단되면 학생 답을 기준으로 다시 확인하고 photoNote에 알린다.

## 공통 규칙
- 해당 학년까지 배운 개념만 쓴다. 고등학교 개념·용어 금지.
- 모든 글은 한국어, 학생에게 말하듯 존댓말로 쓴다.

${LATEX_RULES}`;

export function gradeUserText(data: AnalysisResult): string {
  const lines = [
    `## 학습지 개념: ${data.concept.title}`,
    `## 원래 오답의 실수: ${data.errorPoint}`,
    "",
    "## 문제와 정답",
  ];
  for (const { id, label, problem } of gradableProblems(data)) {
    lines.push("", `### [${id}] ${label}`, problem.text);
    if (problem.choices?.length) lines.push(`보기: ${problem.choices.map((c, i) => `${i + 1}) ${c}`).join("  ")}`);
    lines.push(`정답: ${problem.answer}`, `모범 풀이: ${problem.solution}`);
  }
  lines.push("", "첨부한 사진은 학생이 이 학습지를 직접 푼 것입니다. 문제마다 채점해 주세요.");
  return lines.join("\n");
}

export function analyzeUserText(problem: RecognizedProblem, forcedUnitId?: string): string {
  const lines = [`## 학생이 틀린 문제`, problem.text];
  if (problem.choices?.length) lines.push("", "보기:", ...problem.choices.map((c, i) => `${i + 1}) ${c}`));
  if (problem.studentWork) lines.push("", "## 학생이 쓴 풀이·답", problem.studentWork);
  if (forcedUnitId) lines.push("", `## 지시`, `이 문제는 반드시 단원 ${forcedUnitId}로 분류하고, 그 단원 개념을 중심으로 학습지를 만드세요.`);
  lines.push("", "첨부 사진이 있으면 도형·그래프 확인에 참고하세요.");
  return lines.join("\n");
}
