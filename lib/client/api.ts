import type { AnalysisResult, GradeItem, GradeResult, Problem, RecognizedProblem, RecognizeResult } from "@/lib/schemas";
import { assembleWorksheet, type ConceptPart, type MapPart, type ProblemPart } from "@/lib/ai/analyze";
import { normalizeGrade, type GradeItemsPart } from "@/lib/ai/grade";
import { gradableProblems } from "@/lib/grade";
import { verifyWorksheet, type Solved, type Verdict, type VerifyTarget } from "@/lib/verify/run";
import { USER_KEY_HEADER, getUserKey } from "./apiKey";

/*
 * AI 작업은 호스팅 서비스(Netlify 등)의 실행 시간 제한에 걸리지 않도록
 * 여러 개의 짧은 요청으로 나눠 보내고, 브라우저에서 결과를 합친다.
 */

export type Progress = (done: number, total: number, label: string) => void;

/** 응답이 JSON이 아닐 때(호스팅 서비스의 시간 초과 페이지 등) 상태 코드로 원인을 알려 준다. */
function statusMessage(status: number): string {
  if (status === 504 || status === 502) {
    return `서버 응답 시간이 초과되었습니다 (${status}). 잠시 후 다시 시도해 주세요. 계속되면 사진을 문제 하나만 보이게 잘라서 올려 보세요.`;
  }
  if (status === 413) return "사진이 너무 큽니다. 더 작은 사진으로 다시 시도해 주세요.";
  if (status === 404) return "서버 기능을 찾을 수 없습니다(404). 배포가 끝났는지 확인해 주세요.";
  return `요청 실패 (${status})`;
}

class HttpError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function postOnce<T>(url: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = getUserKey();
  if (key) headers[USER_KEY_HEADER] = key;

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  } catch {
    throw new HttpError("서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.", 0);
  }
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new HttpError(json?.error ?? statusMessage(res.status), res.status);
  if (!json) throw new HttpError("서버 응답을 읽을 수 없습니다.", res.status);
  return json as T;
}

/** AI 응답 형식 오류(502)·일시적 시간 초과(504)는 한 번 더 시도한다. */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  try {
    return await postOnce<T>(url, body);
  } catch (e) {
    if (e instanceof HttpError && (e.status === 502 || e.status === 504)) return postOnce<T>(url, body);
    throw e;
  }
}

async function postResult<T>(url: string, body: unknown): Promise<T> {
  return (await postJson<{ result: T }>(url, body)).result;
}

export function checkConnection(): Promise<{ model: string; ms: number; usingServerKey: boolean }> {
  return postJson("/api/check", {});
}

export function recognize(image: string): Promise<RecognizeResult> {
  return postJson("/api/recognize", { image });
}

// ── 학습지 만들기 ──

/** 1단계: 원래 문제 풀이 + 단원 매핑 + 틀린 지점 */
export function analyzeMap(problem: RecognizedProblem, image?: string, forcedUnitId?: string): Promise<MapPart> {
  return postResult("/api/analyze", { problem, image, forcedUnitId });
}

const PART_LABEL: Record<string, string> = {
  twin1: "쌍둥이 문제 1", twin2: "쌍둥이 문제 2", concept: "개념 설명",
  check1: "확인 문제 1", check2: "확인 문제 2", check3: "확인 문제 3", check4: "확인 문제 4",
};

/**
 * 2단계: 쌍둥이 2개·개념 설명·확인 문제 4개를 각각 따로(동시에) 만들어 합친다.
 * 요청 하나가 문제 1개만 만들어 실행 시간 제한에 걸리지 않게 한다.
 * 확인 문제는 하나가 실패해도 3개 이상이면 학습지를 완성한다.
 */
export async function buildWorksheet(problem: RecognizedProblem, map: MapPart, onProgress?: Progress): Promise<AnalysisResult> {
  const parts = ["twin1", "twin2", "concept", "check1", "check2", "check3", "check4"] as const;
  const total = parts.length;
  let done = 0;
  onProgress?.(0, total, "학습지 만드는 중");

  const request = <T,>(part: string) =>
    postResult<T>("/api/analyze/part", { part, problem, map })
      .then((v) => {
        onProgress?.(++done, total, PART_LABEL[part]);
        return v;
      })
      .catch((e: unknown) => {
        throw new Error(`${PART_LABEL[part]} 만들기 실패: ${e instanceof Error ? e.message : String(e)}`);
      });

  const [twin1, twin2, concept, ...checks] = await Promise.allSettled([
    request<ProblemPart>("twin1"),
    request<ProblemPart>("twin2"),
    request<ConceptPart>("concept"),
    ...["check1", "check2", "check3", "check4"].map((p) => request<ProblemPart>(p)),
  ]);

  const must = <T,>(r: PromiseSettledResult<T>): T => {
    if (r.status === "rejected") throw r.reason;
    return r.value;
  };
  const twins: Problem[] = [must(twin1 as PromiseSettledResult<ProblemPart>).problem, must(twin2 as PromiseSettledResult<ProblemPart>).problem];
  const conceptPart = must(concept as PromiseSettledResult<ConceptPart>);
  const okChecks = checks.flatMap((r) => (r.status === "fulfilled" ? [(r.value as ProblemPart).problem] : []));
  if (okChecks.length < 3) {
    const firstError = checks.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw firstError?.reason ?? new Error("확인 문제를 충분히 만들지 못했습니다.");
  }
  return assembleWorksheet(map, twins, conceptPart, okChecks);
}

/** 단원 확인 없이 한 번에(채점 화면의 '새 쌍둥이 학습지 만들기'용) */
export async function analyze(problem: RecognizedProblem, image?: string, forcedUnitId?: string, onProgress?: Progress): Promise<AnalysisResult> {
  return buildWorksheet(problem, await analyzeMap(problem, image, forcedUnitId), onProgress);
}

// ── 정답 검증 ──

/**
 * 정답 검증: 문제마다 따로(풀기 → 다르면 판정) 요청한다.
 * 실패해도 학습지는 쓸 수 있도록 결과에 표시만 붙여 돌려준다.
 */
export async function verifySafe(worksheet: AnalysisResult, onProgress?: Progress): Promise<AnalysisResult> {
  let errors = 0;
  let done = 0;
  const total = 2 + worksheet.twins.length + worksheet.checkProblems.length;
  const failed = (): AnalysisResult => ({
    ...worksheet,
    verification: { checked: 0, corrected: 0, review: 0, failed: true, at: new Date().toISOString() },
  });

  try {
    onProgress?.(0, total, "정답 검증");
    const result = await verifyWorksheet(worksheet, {
      concurrency: 3,
      solve: async (t) => {
        try {
          const solved = await postResult<Solved>("/api/verify/solve", { target: t });
          return solved;
        } catch (e) {
          errors++;
          throw e;
        } finally {
          onProgress?.(++done, total, "정답 검증");
        }
      },
      adjudicate: (t: VerifyTarget, solved: Solved) => postResult<Verdict>("/api/verify/adjudicate", { target: t, solved }),
    });
    // 전부 오류였다면(키·네트워크 문제) 검증하지 못한 것으로 표시
    return errors >= total ? failed() : result;
  } catch {
    return failed();
  }
}

// ── 채점 ──

/** 채점 묶음: 쌍둥이 2문제, 확인 문제는 2문제씩 */
export function gradeGroups(worksheet: AnalysisResult): string[][] {
  const ids = gradableProblems(worksheet).map((p) => p.id);
  const twins = ids.filter((id) => id.startsWith("T"));
  const checks = ids.filter((id) => id.startsWith("C"));
  const groups = [twins];
  for (let i = 0; i < checks.length; i += 2) groups.push(checks.slice(i, i + 2));
  return groups.filter((g) => g.length > 0);
}

export async function grade(worksheet: AnalysisResult, images: string[], onProgress?: Progress): Promise<GradeResult> {
  const groups = gradeGroups(worksheet);
  const total = groups.length + 1;
  let done = 0;
  onProgress?.(0, total, "채점");

  const parts = await Promise.all(
    groups.map((problemIds) =>
      postResult<GradeItemsPart>("/api/grade", { worksheet, images, problemIds }).then((r) => {
        onProgress?.(++done, total, "채점");
        return r;
      }),
    ),
  );
  const items: GradeItem[] = parts.flatMap((p) => p.items);
  const photoNote = parts.map((p) => p.photoNote).find((n) => n && n.trim());

  let summary = { summary: "", nextStep: "" };
  try {
    summary = await postResult<{ summary: string; nextStep: string }>("/api/grade/summary", { worksheet, items });
  } catch {
    const ok = items.filter((i) => i.status === "correct").length;
    summary = {
      summary: `${items.length}문제 중 ${ok}문제를 맞혔어요. 틀린 문제의 풀이 설명을 꼭 읽어 보세요.`,
      nextStep: "틀린 문제로 새 쌍둥이 학습지를 만들어 한 번 더 연습해 보세요.",
    };
  }
  onProgress?.(total, total, "채점");
  return normalizeGrade({ items, photoNote, ...summary }, worksheet);
}
