import { z } from "zod";
import { aiVerifyDeps } from "@/lib/ai/verify";
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
    // 키가 없으면 모든 문제가 "검토 필요"가 되므로 먼저 막는다
    if (!process.env.ANTHROPIC_API_KEY) throw new AiConfigError("서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다.");
    const result = await verifyWorksheet(body.data.worksheet, aiVerifyDeps);
    return Response.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
