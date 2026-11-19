import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import { AiConfigError, AiOutputError } from "./errors";

/** 서버 오류를 사용자에게 보여 줄 한국어 메시지와 상태 코드로 바꾼다. */
export function toErrorResponse(err: unknown): Response {
  const json = (status: number, error: string) => Response.json({ error }, { status });

  if (err instanceof AiConfigError) return json(401, err.message);
  if (err instanceof AiOutputError || err instanceof ZodError) {
    if (err instanceof ZodError) console.error("AI 응답 형식 오류", err.issues.slice(0, 5));
    return json(502, "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.APIError) {
    const msg = String(err.message ?? "");
    if (err.status === 401) return json(401, "API 키가 올바르지 않습니다. ⚙ 설정에서 키를 다시 확인해 주세요.");
    if (err.status === 403) return json(403, "이 API 키로는 사용할 수 없는 기능이나 모델입니다. 키 권한을 확인해 주세요.");
    if (/credit|balance|billing/i.test(msg)) {
      return json(402, "API 크레딧(잔액)이 부족합니다. console.anthropic.com의 Billing에서 충전해 주세요.");
    }
    if (err.status === 404) return json(500, "설정된 Claude 모델을 찾을 수 없습니다. CLAUDE_MODEL 값을 확인해 주세요.");
    if (err.status === 429) return json(429, "요청이 많습니다. 잠시 후 다시 시도해 주세요.");
    if (err.status === 400) return json(400, "AI가 요청을 처리하지 못했습니다. 사진이나 문제 내용을 확인해 주세요.");
    return json(502, "AI 서비스에 일시적인 문제가 있습니다.");
  }
  console.error(err);
  return json(500, "알 수 없는 오류가 발생했습니다.");
}
