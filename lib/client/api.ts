import type { AnalysisResult, GradeResult, RecognizedProblem, RecognizeResult } from "@/lib/schemas";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? `요청 실패 (${res.status})`);
  return json as T;
}

export function recognize(image: string): Promise<RecognizeResult> {
  return postJson("/api/recognize", { image });
}

export async function analyze(problem: RecognizedProblem, image?: string, forcedUnitId?: string): Promise<AnalysisResult> {
  const { result } = await postJson<{ result: AnalysisResult }>("/api/analyze", { problem, image, forcedUnitId });
  return result;
}

export async function grade(worksheet: AnalysisResult, images: string[]): Promise<GradeResult> {
  const { result } = await postJson<{ result: GradeResult }>("/api/grade", { worksheet, images });
  return result;
}
