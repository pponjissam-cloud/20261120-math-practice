import Anthropic from "@anthropic-ai/sdk";
import { ZodError } from "zod";
import { AiConfigError, AiOutputError } from "./errors";

/** 서버 오류를 사용자에게 보여 줄 한국어 메시지와 상태 코드로 바꾼다. */
export function toErrorResponse(err: unknown): Response {
  const json = (status: number, error: string) => Response.json({ error }, { status });

  if (err instanceof AiConfigError) return json(500, err.message);
  if (err instanceof AiOutputError || err instanceof ZodError) {
    return json(502, "AI 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 429) return json(429, "요청이 많습니다. 잠시 후 다시 시도해 주세요.");
    if (err.status === 401) return json(500, "서버의 API 키가 올바르지 않습니다.");
    if (err.status === 400) return json(400, "AI가 요청을 처리하지 못했습니다. 사진이나 문제 내용을 확인해 주세요.");
    return json(502, "AI 서비스에 일시적인 문제가 있습니다.");
  }
  console.error(err);
  return json(500, "알 수 없는 오류가 발생했습니다.");
}
