/**
 * 사용자가 입력한 Claude API 키를 이 브라우저(localStorage)에만 보관한다.
 * 서버에 키가 설정돼 있지 않을 때, AI 요청마다 헤더로 함께 보내고 서버는 그 요청에만 쓴다(저장하지 않음).
 */
const KEY = "anthropic:userKey";
export const USER_KEY_HEADER = "x-user-api-key";

export function isValidKeyFormat(key: string): boolean {
  return /^sk-ant-[\w-]{20,}$/.test(key.trim());
}

export function getUserKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setUserKey(key: string): void {
  try {
    localStorage.setItem(KEY, key.trim());
  } catch {
    // 저장소를 못 쓰는 환경
  }
}

export function clearUserKey(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}

/** "sk-ant-api03-abcd…wxyz" 형태로 일부만 보여 준다. */
export function maskKey(key: string): string {
  return key.length > 20 ? `${key.slice(0, 13)}…${key.slice(-4)}` : "••••";
}

/** 서버에 키가 설정돼 있는지 */
export async function fetchServerHasKey(): Promise<boolean> {
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    const json = (await res.json()) as { serverKey?: boolean };
    return !!json.serverKey;
  } catch {
    return false;
  }
}
