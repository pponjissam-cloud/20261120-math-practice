import type { AnalysisResult, Problem, Unit } from "@/lib/schemas";

/**
 * 학습지를 출력 형식과 무관한 블록 목록으로 만든다.
 * 같은 블록으로 Markdown(→ pandoc → Word 수식) 과 기본 Word(수식은 텍스트) 를 모두 만든다.
 * 글 안의 수식은 $...$ LaTeX 그대로 둔다.
 */
export type Block =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "para"; text: string; bold?: boolean; small?: boolean }
  | { type: "bullets"; items: string[] }
  | { type: "space"; lines: number }
  | { type: "pagebreak" }
  | { type: "table"; header: string[]; rows: string[][] };

export type ExportContext = {
  unitLabel: string;
  code?: string;
  includeAnswers: boolean;
  /** 교육과정 전체 단원(학기 순) */
  units: Unit[];
  prerequisites: Unit[];
  followUps: Unit[];
};

const CIRCLED = "①②③④⑤";
const sem = (u: Unit) => `중${u.grade}-${u.semester}`;

function pageHeader(title: string, ctx: ExportContext): Block[] {
  return [
    { type: "para", text: ctx.code ? `${ctx.unitLabel} · 학습지 코드 ${ctx.code}` : ctx.unitLabel, small: true },
    { type: "heading", level: 1, text: title },
    { type: "para", text: "날짜: ____________    이름: ________________" },
  ];
}

function problemBlocks(no: number, p: Problem, spaceLines: number): Block[] {
  const blocks: Block[] = [{ type: "para", text: `${no}. ${p.text}`, bold: false }];
  if (p.choices?.length) {
    blocks.push({ type: "para", text: p.choices.map((c, i) => `${CIRCLED[i] ?? `(${i + 1})`} ${c}`).join("      ") });
  }
  blocks.push({ type: "space", lines: spaceLines });
  return blocks;
}

export function buildBlocks(data: AnalysisResult, ctx: ExportContext): Block[] {
  const out: Block[] = [];
  const target = data.mapping.unitId;

  // P1 쌍둥이 문제
  out.push(...pageHeader("쌍둥이 문제", ctx));
  out.push({ type: "para", text: "틀린 문제", bold: true });
  out.push({ type: "para", text: data.original.text });
  if (data.original.choices?.length) {
    out.push({ type: "para", text: data.original.choices.map((c, i) => `${CIRCLED[i] ?? `(${i + 1})`} ${c}`).join("      ") });
  }
  out.push({ type: "para", text: "틀린 문제와 같은 개념으로 풀리는 문제입니다. 풀이 과정을 꼭 써 보세요.", small: true });
  data.twins.forEach((p, i) => out.push(...problemBlocks(i + 1, p, 9)));
  out.push({ type: "pagebreak" });

  // P2 관련 개념
  const c = data.concept;
  out.push(...pageHeader(`관련 개념 이해 — ${c.title}`, ctx));
  out.push({ type: "heading", level: 3, text: "핵심 개념" }, { type: "para", text: c.summary });
  out.push({ type: "heading", level: 3, text: "꼭 기억할 공식·규칙" }, { type: "bullets", items: c.keyFormulas });
  out.push({ type: "heading", level: 3, text: "이 문제에서 틀리기 쉬운 지점" }, { type: "para", text: data.errorPoint });
  out.push({ type: "bullets", items: c.commonMistakes });
  out.push({ type: "heading", level: 3, text: "예제" }, { type: "para", text: c.example.text });
  out.push({ type: "para", text: `풀이: ${c.example.solution}` }, { type: "para", text: `답: ${c.example.answer}`, bold: true });
  out.push({ type: "pagebreak" });

  // P3 개념 확인 문제
  out.push(...pageHeader("개념 확인 문제", ctx));
  out.push({ type: "para", text: "쉬운 문제부터 차례로 풀며 개념을 정확히 알고 있는지 확인하세요.", small: true });
  const space = data.checkProblems.length >= 5 ? 4 : data.checkProblems.length === 4 ? 5 : 7;
  data.checkProblems.forEach((p, i) => out.push(...problemBlocks(i + 1, p, space)));
  out.push({ type: "pagebreak" });

  // P4 교육과정 맵
  out.push(...pageHeader("중학교 수학 전체 과정에서의 위치", ctx));
  out.push({ type: "para", text: "★ 이번 문제 단원   ◆ 먼저 알아야 할 단원   ▷ 이어서 배울 단원", small: true });
  const pre = new Set([...ctx.prerequisites.map((u) => u.id), ...data.mapping.relatedUnitIds]);
  const next = new Set(ctx.followUps.map((u) => u.id));
  const columns = [1, 2, 3].flatMap((g) => [1, 2].map((s) => ctx.units.filter((u) => u.grade === g && u.semester === s)));
  const mark = (u: Unit) =>
    u.id === target ? `★ ${u.title}` : pre.has(u.id) ? `◆ ${u.title}` : next.has(u.id) ? `▷ ${u.title}` : u.title;
  const rowCount = Math.max(...columns.map((col) => col.length));
  out.push({
    type: "table",
    header: columns.map((col) => (col[0] ? sem(col[0]) : "")),
    rows: Array.from({ length: rowCount }, (_, r) => columns.map((col) => (col[r] ? mark(col[r]) : ""))),
  });
  out.push({ type: "para", text: `이번 문제: ${ctx.unitLabel}`, bold: true });
  out.push({ type: "para", text: `분석 근거: ${data.mapping.reason}` });
  if (ctx.prerequisites.length) {
    out.push({ type: "para", text: "이 단원을 위해 먼저 알아야 할 것", bold: true });
    out.push({ type: "bullets", items: ctx.prerequisites.map((u) => `${sem(u)} ${u.title} — ${u.subtopics.slice(0, 3).join(", ")}`) });
  }
  if (ctx.followUps.length) {
    out.push({ type: "para", text: `이어서 배울 단원: ${ctx.followUps.map((u) => `${sem(u)} ${u.title}`).join(", ")}` });
  }

  // P5 정답 및 해설
  if (ctx.includeAnswers) {
    out.push({ type: "pagebreak" });
    out.push(...pageHeader("정답 및 해설", ctx));
    const item = (label: string, p: { answer: string; solution: string; needsReview?: boolean }): Block[] => [
      { type: "para", text: `${label} 답: ${p.answer}${p.needsReview ? "  (정답 확인 필요)" : ""}`, bold: true },
      { type: "para", text: p.solution },
    ];
    out.push({ type: "heading", level: 3, text: "틀린 문제" }, ...item("원래 문제", data.original));
    out.push({ type: "heading", level: 3, text: "쌍둥이 문제" });
    data.twins.forEach((p, i) => out.push(...item(`${i + 1}.`, p)));
    out.push({ type: "heading", level: 3, text: "개념 확인 문제" });
    data.checkProblems.forEach((p, i) => out.push(...item(`${i + 1}.`, p)));
  }
  return out;
}
