import { AnalysisResultSchema, type AnalysisResult } from "@/lib/schemas";

const KEY = "worksheet:current";

/** 분석 결과를 탭 세션에 보관한다(새로고침해도 유지, 탭을 닫으면 사라짐). */
export function saveWorksheet(data: AnalysisResult): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 무시한다.
  }
}

export function loadWorksheet(): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = AnalysisResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearWorksheet(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
