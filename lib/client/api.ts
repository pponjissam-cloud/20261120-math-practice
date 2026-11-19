import type { AnalysisResult, GradeResult, RecognizedProblem, RecognizeResult } from "@/lib/schemas";
import { USER_KEY_HEADER, getUserKey } from "./apiKey";

/** 응답이 JSON이 아닐 때(호스팅 서비스의 시간 초과 페이지 등) 상태 코드로 원인을 알려 준다. */
function statusMessage(status: number): string {
  if (status === 504 || status === 502) {
    return `서버 응답 시간이 초과되었습니다 (${status}). Netlify처럼 실행 시간 제한(10~26초)이 있는 곳에서는 AI 작업이 끝나기 전에 끊길 수 있습니다.`;
  }
  if (status === 413) return "사진이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.";
  if (status === 404) return "서버 기능을 찾을 수 없습니다(404). 배포가 끝났는지 확인해 주세요.";
  return `요청 실패 (${status})`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getUserKey();
  if (key) headers[USER_KEY_HEADER] = key;

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new Error("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.");
  }
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(json?.error ?? statusMessage(res.status));
  if (!json) throw new Error("서버 응답을 읽을 수 없습니다.");
  return json as T;
}

export function checkConnection(): Promise<{ model: string; ms: number; usingServerKey: boolean }> {
  return postJson("/api/check", {});
}

export function recognize(image: string): Promise<RecognizeResult> {
  return postJson("/api/recognize", { image });
}

export async function analyze(problem: RecognizedProblem, image?: string, forcedUnitId?: string): Promise<AnalysisResult> {
  const { result } = await postJson<{ result: AnalysisResult }>("/api/analyze", { problem, image, forcedUnitId });
  return result;
}

/** 정답 검증. 실패해도 학습지는 쓸 수 있도록 "검증 실패" 표시만 붙여 돌려준다. */
export async function verifySafe(worksheet: AnalysisResult): Promise<AnalysisResult> {
  try {
    const { result } = await postJson<{ result: AnalysisResult }>("/api/verify", { worksheet });
    return result;
  } catch {
    return { ...worksheet, verification: { checked: 0, corrected: 0, review: 0, failed: true, at: new Date().toISOString() } };
  }
}

export async function grade(worksheet: AnalysisResult, images: string[]): Promise<GradeResult> {
  const { result } = await postJson<{ result: GradeResult }>("/api/grade", { worksheet, images });
  return result;
}
