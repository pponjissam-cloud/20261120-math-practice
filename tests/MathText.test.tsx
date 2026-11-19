import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MathText, splitMath } from "@/components/math/MathText";

describe("splitMath", () => {
  it("텍스트와 인라인 수식을 나눈다", () => {
    expect(splitMath("방정식 $3x=6$을 풀어라.")).toEqual([
      { kind: "text", value: "방정식 " },
      { kind: "inline", value: "3x=6" },
      { kind: "text", value: "을 풀어라." },
    ]);
  });

  it("블록 수식을 인식한다", () => {
    expect(splitMath("$$x^2$$")).toEqual([{ kind: "block", value: "x^2" }]);
  });

  it("이스케이프된 달러는 텍스트로 남긴다", () => {
    expect(splitMath("가격 \\$5")).toEqual([{ kind: "text", value: "가격 $5" }]);
  });
});

describe("MathText", () => {
  it("KaTeX로 렌더링한다", () => {
    const { container } = render(<MathText text="$\\frac{1}{2}$" />);
    expect(container.querySelector(".katex")).not.toBeNull();
  });
});
