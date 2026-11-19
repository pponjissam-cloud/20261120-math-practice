import { describe, expect, it } from "vitest";
import { buildBlocks } from "@/lib/export/blocks";
import { escapeInline, toMarkdown } from "@/lib/export/markdown";
import { latexTextToPlain } from "@/lib/export/latex-plain";
import { exportContext, exportFileName } from "@/lib/export/context";
import { AnalysisResultSchema } from "@/lib/schemas";
import sample from "./fixtures/sample-analysis.json";

const worksheet = AnalysisResultSchema.parse(sample);

describe("buildBlocks", () => {
  it("정답지 포함이면 5쪽(쪽 나눔 4개), 아니면 4쪽", () => {
    const pb = (answers: boolean) =>
      buildBlocks(worksheet, exportContext(worksheet, { includeAnswers: answers })).filter((b) => b.type === "pagebreak").length;
    expect(pb(true)).toBe(4);
    expect(pb(false)).toBe(3);
  });

  it("교육과정 맵 표에 이번 단원을 ★로 표시한다", () => {
    const table = buildBlocks(worksheet, exportContext(worksheet, { includeAnswers: false })).find((b) => b.type === "table");
    expect(table && table.type === "table" && table.rows.flat()).toContain("★ 일차방정식");
  });

  it("학습지 코드를 머리글에 넣는다", () => {
    const md = toMarkdown(buildBlocks(worksheet, exportContext(worksheet, { code: "K7P2", includeAnswers: false })));
    expect(md).toContain("학습지 코드 K7P2");
  });
});

describe("markdown", () => {
  it("수식 밖 특수문자를 이스케이프하고 수식 앞뒤 공백을 정리한다", () => {
    expect(escapeInline("1. 값은 $ x+1 $이고 *주의*")).toBe("1\\. 값은 $x+1$이고 \\*주의\\*");
  });
  it("쪽 나눔을 Word 쪽 나눔으로 넣는다", () => {
    expect(toMarkdown([{ type: "pagebreak" }])).toContain('w:type="page"');
  });
});

describe("latexTextToPlain (pandoc 없을 때)", () => {
  it.each([
    ["$\\frac{1}{2}x^2 \\times 3$", "1/2x² × 3"],
    ["$\\sqrt{3}$, $-\\frac{a+1}{b}$", "√3, -(a+1)/b"],
    ["$\\angle ABC = 60^\\circ$", "∠ABC = 60°"],
  ])("%s → %s", (a, b) => expect(latexTextToPlain(a)).toBe(b));
});

describe("exportFileName", () => {
  it("단원명과 날짜로 파일 이름을 만든다", () => {
    expect(exportFileName(worksheet, "docx", new Date(2026, 10, 20))).toBe("오답훈련_일차방정식_20261120.docx");
  });
});
