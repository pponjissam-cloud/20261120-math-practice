import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { normalizeAnalysis, normalizeRecognition } from "@/lib/ai/analyze";
import { AiConfigError, AiOutputError } from "@/lib/ai/errors";
import { withRetry } from "@/lib/ai/retry";
import { buildMapTool } from "@/lib/ai/tools";
import { analyzeUserText, mapSystem, partSystem, partUserText } from "@/lib/ai/prompts";
import { assembleWorksheet, normalizeMap } from "@/lib/ai/analyze";
import { curriculum } from "@/lib/curriculum";
import sample from "./fixtures/sample-analysis.json";

const clone = () => structuredClone(sample) as typeof sample & { mapping: Record<string, unknown> };

describe("normalizeAnalysis", () => {
  it("올바른 결과를 통과시킨다", () => {
    expect(normalizeAnalysis(sample).mapping.unitId).toBe("M1-1-04");
  });

  it("교육과정에 없는 단원이면 재시도 대상 오류를 던진다", () => {
    const raw = clone();
    raw.mapping.unitId = "M9-9-99";
    expect(() => normalizeAnalysis(raw)).toThrow(AiOutputError);
  });

  it("관련 단원에서 없는 id·자기 자신·중복을 지운다", () => {
    const raw = clone();
    raw.mapping.relatedUnitIds = ["M1-1-03", "M1-1-03", "M1-1-04", "BAD"];
    expect(normalizeAnalysis(raw).mapping.relatedUnitIds).toEqual(["M1-1-03"]);
  });

  it("사용자가 지정한 단원으로 고정하고 신뢰도를 1로 둔다", () => {
    const raw = clone();
    raw.mapping.confidence = 0.4;
    raw.mapping.candidates = [{ unitId: "M2-1-03", confidence: 0.3 }];
    const r = normalizeAnalysis(raw, { forcedUnitId: "M1-1-03" });
    expect(r.mapping.unitId).toBe("M1-1-03");
    expect(r.mapping.confidence).toBe(1);
    expect(r.mapping.candidates).toBeUndefined();
  });

  it("쌍둥이 문제가 2개가 아니면 형식 오류", () => {
    const raw = clone();
    raw.twins = raw.twins.slice(0, 1);
    expect(() => normalizeAnalysis(raw)).toThrow(ZodError);
  });
});

describe("normalizeRecognition", () => {
  it("빈 문제를 걸러 낸다", () => {
    const r = normalizeRecognition({ quality: "good", problems: [{ text: "$x+1=2$" }, { text: "   " }] });
    expect(r.problems).toHaveLength(1);
  });
});

describe("withRetry", () => {
  it("형식 오류면 한 번 더 시도한다", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new AiOutputError("bad")).mockResolvedValueOnce("ok");
    await expect(withRetry(fn)).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("설정 오류는 재시도하지 않는다", async () => {
    const fn = vi.fn().mockRejectedValue(new AiConfigError("no key"));
    await expect(withRetry(fn)).rejects.toThrow(AiConfigError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("재시도 후에도 실패하면 마지막 오류를 던진다", async () => {
    const fn = vi.fn().mockRejectedValue(new AiOutputError("bad"));
    await expect(withRetry(fn)).rejects.toThrow(AiOutputError);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("tool & prompt", () => {
  it("단원 id enum이 교육과정 전체와 일치한다", () => {
    const schema = buildMapTool(curriculum).input_schema as {
      properties: { mapping: { properties: { unitId: { enum: string[] } } } };
    };
    expect(schema.properties.mapping.properties.unitId.enum).toEqual(curriculum.units.map((u) => u.id));
  });

  it("시스템 프롬프트에 모든 단원이 들어간다", () => {
    const sys = mapSystem(curriculum);
    for (const u of curriculum.units) expect(sys).toContain(u.id);
  });

  it("지정 단원·학생 풀이가 사용자 메시지에 들어간다", () => {
    const text = analyzeUserText({ text: "$2x=4$", studentWork: "x=8" }, "M1-1-04");
    expect(text).toContain("x=8");
    expect(text).toContain("M1-1-04");
  });
});

describe("학습지 나눠 만들기", () => {
  const map = normalizeMap({ original: sample.original, mapping: sample.mapping, errorPoint: sample.errorPoint });

  it("부분들을 하나의 학습지로 합친다(확인 문제 2+2)", () => {
    const ws = assembleWorksheet(
      map,
      { twins: sample.twins as never },
      { concept: sample.concept as never },
      [{ checkProblems: sample.checkProblems.slice(0, 2) as never }, { checkProblems: sample.checkProblems.slice(2, 4) as never }],
    );
    expect(ws.twins).toHaveLength(2);
    expect(ws.checkProblems).toHaveLength(4);
    expect(ws.mapping.unitId).toBe("M1-1-04");
  });

  it("부분 요청 글에 정답·단원·틀린 지점이 들어간다", () => {
    const text = partUserText({ text: sample.original.text }, map, "중1-1 일차방정식");
    expect(text).toContain(sample.original.answer);
    expect(text).toContain("중1-1 일차방정식");
    expect(text).toContain(sample.errorPoint);
  });

  it("부분마다 할 일이 다르다", () => {
    expect(partSystem("twins")).toContain("쌍둥이 문제를 정확히 2개");
    expect(partSystem("check2")).toContain("틀린 지점을 직접 겨냥");
  });
});
