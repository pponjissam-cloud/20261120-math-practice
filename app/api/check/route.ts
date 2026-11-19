import { pingClaude, userKeyFrom } from "@/lib/ai/client";
import { toErrorResponse } from "@/lib/ai/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** API 키 연결 테스트: 아주 짧은 Claude 요청을 보내 키·모델·응답 시간을 확인한다. */
export async function POST(req: Request) {
  try {
    return Response.json(await pingClaude(userKeyFrom(req)));
  } catch (err) {
    return toErrorResponse(err);
  }
}
