/**
 * pandoc이 없을 때 쓰는 대체 변환: LaTeX 수식을 읽기 쉬운 일반 글자로 바꾼다.
 * 예) $\frac{1}{2}x^2 \times 3$ → 1/2x² × 3,  $\sqrt{3}$ → √3
 */

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", n: "ⁿ", x: "ˣ" };
const SYMBOLS: [RegExp, string][] = [
  [/\\times/g, "×"], [/\\div/g, "÷"], [/\\cdot/g, "·"], [/\\pm/g, "±"],
  [/\\(leq|le)\b/g, "≤"], [/\\(geq|ge)\b/g, "≥"], [/\\(neq|ne)\b/g, "≠"],
  [/\^\{?\\circ\}?/g, "°"], [/\\angle\s*/g, "∠"], [/\\triangle\s*/g, "△"], [/\\square/g, "□"], [/\\circ/g, "°"],
  [/\\pi/g, "π"], [/\\infty/g, "∞"], [/\\parallel/g, "∥"], [/\\perp/g, "⊥"], [/\\equiv/g, "≡"],
  [/\\sim/g, "∽"], [/\\cong/g, "≡"], [/\\approx/g, "≈"], [/\\therefore/g, "∴"], [/\\because/g, "∵"],
  [/\\(left|right)/g, ""], [/\\[,;!]|\\quad|\\qquad/g, " "], [/\\ /g, " "],
];

function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  return s.length - 1;
}

/** \cmd{arg} 을 찾아 fn(arg) 로 바꾼다(안쪽부터 반복). */
function replaceCommand(s: string, cmd: string, fn: (arg: string, rest: string) => [string, string]): string {
  for (let guard = 0; guard < 200; guard++) {
    const i = s.lastIndexOf(`\\${cmd}{`);
    if (i < 0) break;
    const open = i + cmd.length + 1;
    const close = matchBrace(s, open);
    const [rep, rest] = fn(s.slice(open + 1, close), s.slice(close + 1));
    s = s.slice(0, i) + rep + rest;
  }
  return s;
}

const wrap = (x: string) => (/^[\w.]+$|^[^\s+\-]$/u.test(x) ? x : `(${x})`);

export function mathToPlain(math: string): string {
  let s = math.trim();
  s = replaceCommand(s, "text", (a, r) => [a, r]);
  s = replaceCommand(s, "mathrm", (a, r) => [a, r]);
  s = replaceCommand(s, "overline", (a, r) => [`${a}̅`.replace(/(.)(?!$)/gu, "$1̅"), r]);
  s = replaceCommand(s, "dot", (a, r) => [`${a}̇`, r]);
  s = replaceCommand(s, "sqrt", (a, r) => [`√${wrap(a)}`, r]);
  s = s.replace(/\\[dt]frac/g, "\\frac");
  s = replaceCommand(s, "frac", (a, r) => {
    const close = matchBrace(r, 0);
    return [`${wrap(a)}/${wrap(r.slice(1, close))}`, r.slice(close + 1)];
  });
  for (const [re, rep] of SYMBOLS) s = s.replace(re, rep);
  s = s.replace(/\^\{([^{}]*)\}|\^(.)/g, (_, g1: string | undefined, g2: string | undefined) => {
    const t = g1 ?? g2 ?? "";
    return [...t].every((ch) => SUP[ch]) ? [...t].map((ch) => SUP[ch]).join("") : `^(${t})`;
  });
  s = s.replace(/_\{([^{}]*)\}|_(.)/g, (_, a: string | undefined, b: string | undefined) => a ?? b ?? "");
  return s.replace(/\\([a-zA-Z]+)/g, "$1").replace(/[{}]/g, "").replace(/\s{2,}/g, " ");
}

/** 글 속 $...$ 수식을 모두 일반 글자로 */
export function latexTextToPlain(text: string): string {
  return text.replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, a: string | undefined, b: string | undefined) => mathToPlain(a ?? b ?? ""));
}
