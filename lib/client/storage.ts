import { z } from "zod";
import { AnalysisResultSchema, GradeResultSchema, type AnalysisResult, type GradeResult } from "@/lib/schemas";

/**
 * 만든 학습지를 이 브라우저(localStorage)에 보관한다.
 * 인쇄해서 푼 뒤 며칠 뒤에 채점해도 같은 기기·브라우저라면 학습지 코드로 다시 찾을 수 있다.
 */
const LIST_KEY = "worksheets:v1";
const CURRENT_KEY = "worksheets:current";
const MAX_SAVED = 30;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 헷갈리는 0/O, 1/I 제외

const SavedSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  data: AnalysisResultSchema,
  grade: GradeResultSchema.optional(),
  gradedAt: z.string().optional(),
});
export type SavedWorksheet = z.infer<typeof SavedSchema>;

function readAll(): SavedWorksheet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LIST_KEY) ?? "[]");
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const parsed = SavedSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
  } catch {
    return [];
  }
}

function writeAll(list: SavedWorksheet[]): void {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    // 저장소를 못 쓰는 환경(사생활 보호 모드, 용량 초과)에서는 무시한다.
  }
}

export function newCode(existing: Set<string>): string {
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(4));
    const code = Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join("");
    if (!existing.has(code)) return code;
  }
}

export function saveWorksheet(data: AnalysisResult): SavedWorksheet {
  const list = readAll();
  const saved: SavedWorksheet = { id: newCode(new Set(list.map((w) => w.id))), createdAt: new Date().toISOString(), data };
  writeAll([saved, ...list]);
  setCurrentWorksheet(saved.id);
  return saved;
}

export function listWorksheets(): SavedWorksheet[] {
  return readAll();
}

export function getWorksheet(id: string): SavedWorksheet | null {
  const code = id.trim().toUpperCase();
  return readAll().find((w) => w.id === code) ?? null;
}

export function setCurrentWorksheet(id: string): void {
  try {
    localStorage.setItem(CURRENT_KEY, id);
  } catch {
    // 무시
  }
}

export function getCurrentWorksheet(): SavedWorksheet | null {
  try {
    const id = localStorage.getItem(CURRENT_KEY);
    return (id && getWorksheet(id)) || readAll()[0] || null;
  } catch {
    return null;
  }
}

export function saveGrade(id: string, grade: GradeResult): void {
  writeAll(readAll().map((w) => (w.id === id ? { ...w, grade, gradedAt: new Date().toISOString() } : w)));
}
