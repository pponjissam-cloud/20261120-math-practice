import { describe, expect, it } from "vitest";
import { allPrerequisites, curriculum, followUps, getUnit, unitsBySemester } from "@/lib/curriculum";
import { AnalysisResultSchema } from "@/lib/schemas";
import sample from "./fixtures/sample-analysis.json";

describe("curriculum data", () => {
  it("모든 학기에 단원이 있다", () => {
    for (const g of [1, 2, 3]) for (const s of [1, 2]) expect(unitsBySemester(g, s).length).toBeGreaterThan(0);
  });

  it("단원 id가 중복되지 않는다", () => {
    const ids = curriculum.units.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("선수 단원은 모두 존재하고 더 앞 학기에 있다", () => {
    const order = (u: { grade: number; semester: number }) => u.grade * 2 + u.semester;
    for (const u of curriculum.units) {
      for (const p of u.prerequisites) {
        const pre = getUnit(p);
        expect(pre, `${u.id}의 선수 ${p}`).toBeDefined();
        expect(order(pre!)).toBeLessThanOrEqual(order(u));
      }
    }
  });

  it("선수 단원을 재귀적으로 찾는다", () => {
    const ids = allPrerequisites("M1-1-04").map((u) => u.id);
    expect(ids).toEqual(["M1-1-03", "M1-1-02"]);
  });

  it("후속 단원을 찾는다", () => {
    expect(followUps("M1-1-04").map((u) => u.id)).toEqual(expect.arrayContaining(["M2-1-03", "M2-1-04"]));
  });
});

describe("sample fixture", () => {
  it("AnalysisResult 스키마를 통과하고 단원이 실제 존재한다", () => {
    const data = AnalysisResultSchema.parse(sample);
    expect(getUnit(data.mapping.unitId)).toBeDefined();
    expect(data.twins).toHaveLength(2);
  });
});
