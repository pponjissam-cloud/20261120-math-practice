import { describe, expect, it } from "vitest";
import { ProblemSchema, RecognizeResultSchema } from "@/lib/schemas";
import { KEY_PREFIX, isValidKeyFormat, maskKey } from "@/lib/client/apiKey";

// 진짜 키처럼 보이는 문자열을 저장소에 두지 않는다(Netlify 비밀 키 검사 오탐 방지)
const fakeKey = (body: string) => `${KEY_PREFIX}test-${body}`;

describe("인식 결과는 도형 형식이 틀려도 실패하지 않는다", () => {
  it("잘못된 도형은 버리고 문제 글은 살린다", () => {
    const r = RecognizeResultSchema.parse({
      quality: "good",
      problems: [{ number: 11, text: "두 모서리 CD, DH와 동시에 꼬인 위치에 있는 모서리는?", figure: { type: "3d-solid", points: "A,B,C" } }],
    });
    expect(r.problems[0].figure).toBeUndefined();
    expect(r.problems[0].number).toBe("11");
    expect(r.problems[0].text).toContain("꼬인 위치");
  });

  it("입체도형: 문자열 선분 'AB'와 점선 모서리를 받아 준다", () => {
    const r = RecognizeResultSchema.parse({
      quality: "good",
      problems: [{
        text: "입체도형",
        figure: {
          type: "solid",
          points: [{ label: "A", x: 2, y: 5 }, { label: "B", x: "1", y: "3" }, { label: "F", x: 1, y: 0 }],
          segments: ["AB", ["B", "F"]],
          dashed: ["BF"],
        },
      }],
    });
    const fig = r.problems[0].figure!;
    expect(fig.segments).toEqual([["A", "B"], ["B", "F"]]);
    expect(fig.dashed).toEqual([["B", "F"]]);
    expect(fig.points?.[1]).toEqual({ label: "B", x: 1, y: 3 });
  });
});

describe("난이도는 숫자 문자열도 받아 준다", () => {
  it.each([["2", 2], [5, 3], [0, 1], ["어려움", 2]])("%s → %s", (input, expected) => {
    const p = ProblemSchema.parse({ text: "t", answer: "a", solution: "s", difficulty: input });
    expect(p.difficulty).toBe(expected);
  });
});

describe("API 키", () => {
  it("형식 검사", () => {
    expect(isValidKeyFormat(fakeKey("x".repeat(30)))).toBe(true);
    expect(isValidKeyFormat("sk-proj-abc")).toBe(false);
    expect(isValidKeyFormat("")).toBe(false);
  });
  it("일부만 보여 준다", () => {
    const k = fakeKey("0".repeat(20) + "WXYZ");
    expect(maskKey(k)).toBe(`${k.slice(0, 13)}…WXYZ`);
  });
});

describe("AI가 형식을 조금 다르게 보내도 받아 준다", () => {
  it("답이 숫자, 풀이가 줄 목록, problem 없이 바로 온 경우", async () => {
    const { ProblemPartSchema, unwrapPart } = await import("@/lib/ai/analyze");
    const r = ProblemPartSchema.parse(
      unwrapPart("twin1", { text: "모서리는 몇 개?", choices: [1, 2, 3], answer: 3, solution: ["1단계", "2단계"], difficulty: "2" }),
    );
    expect(r.problem.answer).toBe("3");
    expect(r.problem.solution).toBe("1단계\n2단계");
    expect(r.problem.choices).toEqual(["1", "2", "3"]);
  });
});

describe("문제 칸 이름·모양이 달라도 받아 준다", () => {
  it("problem 칸에 문제 글만 넣고 답·풀이는 바깥에 둔 경우", async () => {
    const { ProblemPartSchema, unwrapPart } = await import("@/lib/ai/analyze");
    const r = ProblemPartSchema.parse(unwrapPart("twin1", { problem: "꼬인 위치?", answer: "③ 3개", solution: "s", difficulty: 2 }));
    expect(r.problem.text).toBe("꼬인 위치?");
  });
  it("question·정답·explanation 같은 다른 이름", async () => {
    const { ProblemPartSchema, unwrapPart } = await import("@/lib/ai/analyze");
    const r = ProblemPartSchema.parse(unwrapPart("twin1", { problem: { question: "q", 정답: 3, explanation: "e", level: 2 } }));
    expect([r.problem.text, r.problem.answer, r.problem.solution]).toEqual(["q", "3", "e"]);
  });
});
