/**
 * 모델이 도구 호출 대신 글로 JSON을 보냈을 때 꺼내 읽는다.
 * ```json … ``` 코드 블록을 먼저 찾고, 없으면 처음 { 부터 마지막 } 까지를 시도한다.
 */
export function extractJson(text: string): unknown | undefined {
  const candidates: string[] = [];
  for (const m of text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)) candidates.push(m[1]);
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1));
  for (const c of candidates) {
    try {
      const v: unknown = JSON.parse(c.trim());
      if (v && typeof v === "object") return v;
    } catch {
      // 다음 후보
    }
  }
  return undefined;
}
