import { beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { normalizeGrade, normalizeGradeItems } from "@/lib/ai/grade";
import { gradeGroups } from "@/lib/client/api";
import { buildGradeItemsTool } from "@/lib/ai/tools";
import { GRADE_SYSTEM, gradeUserText } from "@/lib/ai/prompts";
import { gradableProblems, scoreOf } from "@/lib/grade";
import { getCurrentWorksheet, getWorksheet, listWorksheets, saveGrade, saveWorksheet } from "@/lib/client/storage";
import { AnalysisResultSchema } from "@/lib/schemas";
import sample from "./fixtures/sample-analysis.json";

const worksheet = AnalysisResultSchema.parse(sample);
const item = (problemId: string, status: string) => ({ problemId, status, feedback: "f", explanation: "e" });

describe("gradableProblems", () => {
  it("쌍둥이 2개 + 확인 문제를 T1.., C1.. 순서로 나열한다", () => {
    expect(gradableProblems(worksheet).map((p) => p.id)).toEqual(["T1", "T2", "C1", "C2", "C3", "C4"]);
  });
});

describe("normalizeGrade", () => {
  it("빠진 문제는 '사진에 없음'으로 채우고 학습지 순서로 정렬한다", () => {
    const r = normalizeGrade({ items: [item("C1", "correct"), item("T1", "wrong")], summary: "s", nextStep: "n" }, worksheet);
    expect(r.items.map((i) => [i.problemId, i.status])).toEqual([
      ["T1", "wrong"], ["T2", "not_found"], ["C1", "correct"], ["C2", "not_found"], ["C3", "not_found"], ["C4", "not_found"],
    ]);
    expect(r.items[1].explanation).toBe(worksheet.twins[1].solution);
  });

  it("없는 id와 중복은 버린다(첫 번째 것을 쓴다)", () => {
    const r = normalizeGrade({ items: [item("T1", "correct"), item("T1", "wrong"), item("X9", "correct")], summary: "s", nextStep: "n" }, worksheet);
    expect(r.items[0].status).toBe("correct");
    expect(r.items.some((i) => i.problemId === "X9")).toBe(false);
  });

  it("형식이 틀리면 오류", () => {
    expect(() => normalizeGrade({ items: [{ problemId: "T1", status: "great" }], summary: "s", nextStep: "n" }, worksheet)).toThrow(ZodError);
  });
});

describe("scoreOf", () => {
  it("사진에 없는 문제는 분모에서 뺀다", () => {
    const r = normalizeGrade({ items: [item("T1", "correct"), item("T2", "partial"), item("C1", "wrong")], summary: "s", nextStep: "n" }, worksheet);
    expect(scoreOf(r)).toEqual({ correct: 1, partial: 1, graded: 3 });
  });
});

describe("grade tool & prompt", () => {
  it("problemId enum은 학습지 문제 목록과 같다", () => {
    const schema = buildGradeItemsTool(["T1", "C1"]).input_schema as {
      properties: { items: { items: { properties: { problemId: { enum: string[] } } } } };
    };
    expect(schema.properties.items.items.properties.problemId.enum).toEqual(["T1", "C1"]);
  });

  it("사용자 메시지에 문제 id·정답·원래 실수가 들어간다", () => {
    const text = gradeUserText(worksheet);
    expect(text).toContain("[T2]");
    expect(text).toContain(worksheet.checkProblems[2].answer);
    expect(text).toContain(worksheet.errorPoint);
    expect(GRADE_SYSTEM).toContain("partial");
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("저장하면 4자리 코드가 생기고 코드로 다시 찾는다(대소문자 무시)", () => {
    const saved = saveWorksheet(worksheet);
    expect(saved.id).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
    expect(getWorksheet(saved.id.toLowerCase())?.data.mapping.unitId).toBe("M1-1-04");
    expect(getCurrentWorksheet()?.id).toBe(saved.id);
  });

  it("채점 결과를 학습지에 붙여 저장한다", () => {
    const saved = saveWorksheet(worksheet);
    const g = normalizeGrade({ items: [item("T1", "correct")], summary: "s", nextStep: "n" }, worksheet);
    saveGrade(saved.id, g);
    expect(getWorksheet(saved.id)?.grade?.items[0].status).toBe("correct");
  });

  it("최근 것이 앞에 오고 30개까지만 보관한다", () => {
    for (let i = 0; i < 32; i++) saveWorksheet(worksheet);
    expect(listWorksheets()).toHaveLength(30);
  });
});

describe("채점 나눠 하기", () => {
  it("쌍둥이 2문제, 확인 문제는 2문제씩 묶는다", () => {
    expect(gradeGroups(worksheet)).toEqual([["T1", "T2"], ["C1", "C2"], ["C3", "C4"]]);
  });

  it("요청한 문제만 남기고 빠진 문제는 '사진에 없음'", () => {
    const r = normalizeGradeItems({ items: [item("C1", "correct"), item("T1", "wrong")] }, worksheet, ["C1", "C2"]);
    expect(r.items.map((i) => [i.problemId, i.status])).toEqual([["C1", "correct"], ["C2", "not_found"]]);
  });

  it("일부만 채점할 때 요청 글에 그 문제만 들어간다", () => {
    const text = gradeUserText(worksheet, ["C3"]);
    expect(text).toContain("[C3]");
    expect(text).not.toContain("[T1]");
  });
});
