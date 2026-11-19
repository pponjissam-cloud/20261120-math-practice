import { describe, expect, it } from "vitest";
import { ProblemSchema, RecognizeResultSchema } from "@/lib/schemas";
import { isValidKeyFormat, maskKey } from "@/lib/client/apiKey";

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
    expect(isValidKeyFormat("sk-ant-api03-" + "x".repeat(40))).toBe(true);
    expect(isValidKeyFormat("sk-proj-abc")).toBe(false);
    expect(isValidKeyFormat("")).toBe(false);
  });
  it("일부만 보여 준다", () => {
    expect(maskKey("sk-ant-api03-abcdefghijklmnopWXYZ")).toBe("sk-ant-api03-…WXYZ");
  });
});
