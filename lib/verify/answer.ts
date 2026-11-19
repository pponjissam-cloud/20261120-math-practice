import { evaluate, variablesOf } from "./expr";

/**
 * 두 답이 같은지 판단한다. 같은 값의 다른 표현을 같은 답으로 본다.
 *  - "$x=14$" = "14" = "14개"
 *  - "$\frac{1}{2}$" = "0.5",  "$2\sqrt{3}$" = "$\sqrt{12}$"
 *  - "$2x+6$" = "$6+2x$" (문자에 여러 값을 넣어 비교)
 *  - "③ $x=2$" = "③"  (객관식은 보기 번호로 비교)
 *  - "x=2, y=3" = "y=3, x=2"
 * 판단할 수 없으면 false — 이때는 AI 판정 단계로 넘어간다.
 */

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

export function choiceNumber(s: string): number | null {
  for (const ch of s) {
    const i = CIRCLED.indexOf(ch);
    if (i >= 0) return i + 1;
  }
  return null;
}

/** 비교하기 쉬운 모양으로 정리한다. 여러 답은 쉼표로 나눈 배열로 돌려준다. */
export function normalizeParts(raw: string): string[] {
  let s = raw
    .replace(/[①-⑩]/g, "")
    .replace(/\$/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1")
    .replace(/^\s*(정답|답)\s*[:：]?/, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[,;!]|\\quad|\\ /g, "")
    .replace(/\\(geq|ge)\b|≥/g, ">=")
    .replace(/\\(leq|le)\b|≤/g, "<=")
    .replace(/\\(neq|ne)\b|≠/g, "!=")
    .replace(/−/g, "-")
    .replace(/\^\{?\\circ\}?|°/g, "")
    .replace(/또는|이고|and|or|;/g, ",")
    .replace(/\s+/g, "");

  return s
    .split(",")
    .map((p) =>
      p
        .replace(/(?<=[\d)}])(cm|mm|km|kg|mL|m|g|L)(\^\{?[23]\}?|²|³)?$/, "")
        .replace(/[가-힣]+$/, "")
        .replace(/[.。]$/, ""),
    )
    .filter((p) => p.length > 0);
}

/** "x=3" → { name: "x", value: "3" } (부등식·식은 이름 없음) */
function splitNamed(part: string): { name: string | null; value: string } {
  const m = /^([a-zA-Z])=(.+)$/.exec(part);
  return m ? { name: m[1], value: m[2] } : { name: null, value: part };
}

const close = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** 식 두 개가 같은 값(또는 같은 식)인지 */
export function sameExpression(a: string, b: string): boolean {
  if (a === b) return true;
  if (/[<>!]=?/.test(a) || /[<>!]=?/.test(b)) return false; // 부등식은 문자열이 같을 때만
  try {
    const vars = [...new Set([...variablesOf(a), ...variablesOf(b)])];
    if (vars.length === 0) return close(evaluate(a), evaluate(b));
    // 문자에 서로 다른 값 세 벌을 넣어 모두 같으면 같은 식으로 본다
    const samples = [1.37, -2.41, 3.73];
    return samples.every((base, k) => {
      const env = Object.fromEntries(vars.map((v, i) => [v, base + i * 0.917 + k * 0.113]));
      return close(evaluate(a, env), evaluate(b, env));
    });
  } catch {
    return false;
  }
}

export function sameAnswer(a: string, b: string): boolean {
  const ca = choiceNumber(a);
  const cb = choiceNumber(b);
  if (ca !== null && cb !== null) return ca === cb;

  const pa = normalizeParts(a).map(splitNamed);
  const pb = normalizeParts(b).map(splitNamed);
  if (pa.length === 0 || pa.length !== pb.length) return false;

  // 답이 하나면 "x=" 유무와 관계없이 값만 비교
  if (pa.length === 1) {
    if (pa[0].name && pb[0].name && pa[0].name !== pb[0].name) return false;
    return sameExpression(pa[0].value, pb[0].value);
  }

  // 여러 답: 순서와 관계없이 짝을 찾는다
  const used = new Set<number>();
  return pa.every((x) => {
    const j = pb.findIndex((y, idx) => !used.has(idx) && (x.name === y.name || !x.name || !y.name) && sameExpression(x.value, y.value));
    if (j < 0) return false;
    used.add(j);
    return true;
  });
}
