import { describe, expect, it } from "vitest";
import { sameAnswer } from "@/lib/verify/answer";
import { evaluate } from "@/lib/verify/expr";
import { verifyTargets, verifyWorksheet, type Verdict } from "@/lib/verify/run";
import { AnalysisResultSchema } from "@/lib/schemas";
import sample from "./fixtures/sample-analysis.json";

const worksheet = AnalysisResultSchema.parse(sample);

describe("sameAnswer — 같은 답", () => {
  it.each([
    ["$x=14$", "14"], ["$x=14$", "$14$개"], ["$\\frac{1}{2}$", "0.5"], ["$2\\sqrt{3}$", "$\\sqrt{12}$"],
    ["$2x+6$", "$6+2x$"], ["$-3x+12$", "$12-3x$"], ["③ $x=2$", "③"], ["$x=2, y=3$", "$y=3$, $x=2$"],
    ["$x=-2$", "$-2$"], ["$12\\pi\\text{ cm}^2$", "$12\\pi$ cm$^2$"], ["$x \\geq 3$", "$x\\ge 3$"],
    ["$(x+1)^2$", "$x^2+2x+1$"], ["$\\dfrac{3}{4}$", "$\\frac{6}{8}$"], ["$60^\\circ$", "60°"],
    ["$x=1$ 또는 $x=3$", "$x=3, x=1$"], ["답: $5$", "5"], ["$2^3$", "8"], ["$-2^2$", "-4"],
  ])("%s = %s", (a, b) => expect(sameAnswer(a, b)).toBe(true));
});

describe("sameAnswer — 다른 답", () => {
  it.each([
    ["$x=14$", "15"], ["③", "④"], ["$2x+6$", "$2x+5$"], ["$x>3$", "$x<3$"], ["$x=2$", "$y=2$"],
    ["$x=2, y=3$", "$x=3, y=2$"], ["$\\frac{1}{2}$", "$\\frac{1}{3}$"], ["$x=1$ 또는 $x=3$", "$x=1$"],
  ])("%s ≠ %s", (a, b) => expect(sameAnswer(a, b)).toBe(false));
});

describe("evaluate", () => {
  it("암묵적 곱·분수·제곱근을 계산한다", () => {
    expect(evaluate("2(3+4)")).toBe(14);
    expect(evaluate("\\frac{6}{\\sqrt{4}}")).toBe(3);
    expect(evaluate("3x^2", { x: 2 })).toBe(12);
  });
  it("모르는 기호는 오류", () => expect(() => evaluate("x!")).toThrow());
});

describe("verifyWorksheet", () => {
  it("원래 문제·예제·쌍둥이·확인 문제를 모두 검증 대상으로 잡는다", () => {
    expect(verifyTargets(worksheet).map((t) => t.id)).toEqual(["O", "E", "T1", "T2", "C1", "C2", "C3", "C4"]);
  });

  it("같으면 통과, 다르면 판정에 따라 고치거나 검토 필요로 표시한다", async () => {
    const answers = Object.fromEntries(verifyTargets(worksheet).map((t) => [t.id, t.answer]));
    let adjudicated = 0;
    const out = await verifyWorksheet(worksheet, {
      solve: async (t) => {
        if (t.id === "T2") return { answer: "$x=3$", solution: "s" };
        if (t.id === "C3") return { answer: "$x=7$", solution: "s" };
        if (t.id === "C4") throw new Error("network");
        if (t.id === "C1") return { answer: "$6+2x$", solution: "s" }; // 같은 식, 다른 표현
        return { answer: answers[t.id], solution: "s" };
      },
      adjudicate: async (t): Promise<Verdict> => {
        adjudicated++;
        return t.id === "T2" ? { verdict: "key_wrong", answer: "$x=3$", solution: "new" } : { verdict: "unsure" };
      },
    });
    expect(adjudicated).toBe(2);
    expect(out.verification).toMatchObject({ checked: 8, corrected: 1, review: 2 });
    expect(out.twins[1]).toMatchObject({ answer: "$x=3$", solution: "new" });
    expect(out.twins[1].verifyNote).toMatch(/처음 정답/);
    expect(out.checkProblems[2].needsReview).toBe(true);
    expect(out.checkProblems[3].needsReview).toBe(true);
    expect(out.checkProblems[0].needsReview).toBeUndefined();
  });
});
