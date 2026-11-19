import { z } from "zod";
import { aiVerifyDeps } from "@/lib/ai/verify";
import { hasServerKey, userKeyFrom } from "@/lib/ai/client";
import { AiConfigError } from "@/lib/ai/errors";
import { toErrorResponse } from "@/lib/ai/http";
import { verifyWorksheet } from "@/lib/verify/run";
import { AnalysisResultSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({ worksheet: AnalysisResultSchema });

/** 학습지의 모든 문제 정답을 독립 풀이로 다시 확인한다. 문제별 실패는 "검토 필요"로 표시되고 전체는 실패하지 않는다. */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    const apiKey = userKeyFrom(req);
    // 키가 없으면 모든 문제가 "검토 필요"가 되므로 먼저 막는다
    if (!hasServerKey() && !apiKey) throw new AiConfigError("API 키가 없습니다. 화면 위쪽 ⚙ 설정에서 Claude API 키를 입력해 주세요.");
    const result = await verifyWorksheet(body.data.worksheet, aiVerifyDeps(apiKey));
    return Response.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
