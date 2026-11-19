/**
 * 중학교 수준 LaTeX 수식을 숫자로 계산하는 작은 계산기(외부 라이브러리 없음).
 * 지원: 정수·소수, + - × ÷ ^, 괄호, \frac, \sqrt, \pi, 한 글자 문자(변수), 암묵적 곱(2x, 3\sqrt{2}, 2(x+1))
 */

type Token =
  | { t: "num"; v: number }
  | { t: "var"; v: string }
  | { t: "op"; v: "+" | "-" | "*" | "/" | "^" }
  | { t: "(" }
  | { t: ")" }
  | { t: "sqrt" };

/** 짝이 맞는 중괄호 {…}의 끝 위치를 찾는다. */
function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  throw new Error("중괄호 짝이 맞지 않음");
}

/** \frac{a}{b} → ((a)/(b)), \sqrt{a} → √(a) 로 바꾸고 나머지 LaTeX 명령을 계산용 기호로 바꾼다. */
export function latexToCalc(input: string): string {
  let s = input
    .replace(/\$/g, "")
    .replace(/\\left|\\right/g, "")
    .replace(/\\[dt]frac/g, "\\frac")
    .replace(/\\(times|cdot)/g, "*")
    .replace(/\\div/g, "/")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\\pi/g, "π")
    .replace(/\\[,;!]|\\quad|\\ /g, "")
    .replace(/\s+/g, "");

  for (;;) {
    const f = s.indexOf("\\frac{");
    if (f < 0) break;
    const aEnd = matchBrace(s, f + 5);
    if (s[aEnd + 1] !== "{") throw new Error("\\frac 형식 오류");
    const bEnd = matchBrace(s, aEnd + 1);
    s = `${s.slice(0, f)}((${s.slice(f + 6, aEnd)})/(${s.slice(aEnd + 2, bEnd)}))${s.slice(bEnd + 1)}`;
  }
  for (;;) {
    const r = s.indexOf("\\sqrt{");
    if (r < 0) break;
    const end = matchBrace(s, r + 5);
    s = `${s.slice(0, r)}√(${s.slice(r + 6, end)})${s.slice(end + 1)}`;
  }
  return s.replace(/\{/g, "(").replace(/\}/g, ")");
}

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+|^\d+\.?/.exec(s.slice(i))!;
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
    } else if (c === "π") {
      out.push({ t: "num", v: Math.PI }); i++;
    } else if (c === "√") {
      out.push({ t: "sqrt" }); i++;
    } else if (/[a-zA-Z]/.test(c)) {
      out.push({ t: "var", v: c }); i++;
    } else if ("+-*/^".includes(c)) {
      out.push({ t: "op", v: c as "+" }); i++;
    } else if (c === "(" || c === ")") {
      out.push({ t: c }); i++;
    } else {
      throw new Error(`계산할 수 없는 문자: ${c}`);
    }
  }
  // 암묵적 곱 삽입: [수·문자·)] 다음에 [수·문자·(·√]
  const withMul: Token[] = [];
  for (const tok of out) {
    const prev = withMul[withMul.length - 1];
    const prevEnds = prev && (prev.t === "num" || prev.t === "var" || prev.t === ")");
    const curStarts = tok.t === "num" || tok.t === "var" || tok.t === "(" || tok.t === "sqrt";
    if (prevEnds && curStarts) withMul.push({ t: "op", v: "*" });
    withMul.push(tok);
  }
  return withMul;
}

/** 재귀 하강 파서로 계산한다. vars에 문자 값을 넣는다. */
export function evaluate(latex: string, vars: Record<string, number> = {}): number {
  const toks = tokenize(latexToCalc(latex));
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => { const t = peek(); return t?.t === "op" && t.v === v; };

  function expr(): number {
    let v = term();
    while (isOp("+") || isOp("-")) {
      const op = (toks[pos++] as { v: string }).v;
      v = op === "+" ? v + term() : v - term();
    }
    return v;
  }
  function term(): number {
    let v = unary();
    while (isOp("*") || isOp("/")) {
      const op = (toks[pos++] as { v: string }).v;
      v = op === "*" ? v * unary() : v / unary();
    }
    return v;
  }
  function unary(): number {
    if (isOp("-")) { pos++; return -unary(); }
    if (isOp("+")) { pos++; return unary(); }
    return power();
  }
  function power(): number {
    const base = primary();
    if (isOp("^")) { pos++; return base ** unary(); }
    return base;
  }
  function primary(): number {
    const t = toks[pos++];
    if (!t) throw new Error("식이 끝남");
    if (t.t === "num") return t.v;
    if (t.t === "var") {
      if (!(t.v in vars)) throw new Error(`값을 모르는 문자: ${t.v}`);
      return vars[t.v];
    }
    if (t.t === "sqrt") return Math.sqrt(power());
    if (t.t === "(") {
      const v = expr();
      if (toks[pos++]?.t !== ")") throw new Error("괄호 짝이 맞지 않음");
      return v;
    }
    throw new Error("식 형식 오류");
  }

  const v = expr();
  if (pos !== toks.length) throw new Error("식 형식 오류");
  return v;
}

/** 식에 들어 있는 문자(변수) 목록 */
export function variablesOf(latex: string): string[] {
  return [...new Set(tokenize(latexToCalc(latex)).flatMap((t) => (t.t === "var" ? [t.v] : [])))].sort();
}
