import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, imageBlock, userKeyFrom } from "@/lib/ai/client";
import { analyzeUserText, mapSystem } from "@/lib/ai/prompts";
import { buildMapTool } from "@/lib/ai/tools";
import { normalizeMap } from "@/lib/ai/analyze";
import { toErrorResponse } from "@/lib/ai/http";
import { curriculum, getUnit } from "@/lib/curriculum";
import { RecognizedProblemSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  problem: RecognizedProblemSchema,
  image: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/).max(7_000_000).optional(),
  forcedUnitId: z.string().refine((id) => !!getUnit(id), "없는 단원입니다.").optional(),
});

const SYSTEM = mapSystem(curriculum);
const TOOL = buildMapTool(curriculum);

/**
 * 학습지 만들기 1단계: 원래 문제 풀이 + 단원 매핑 + 틀린 지점.
 * (호스팅 실행 시간 제한 때문에 학습지는 여러 요청으로 나눠 만든다. 형식 오류 재시도는 클라이언트가 한다.)
 */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { problem, image, forcedUnitId } = body.data;

  try {
    const content: Anthropic.ContentBlockParam[] = [];
    if (image) content.push(imageBlock(image));
    content.push({ type: "text", text: analyzeUserText(problem, forcedUnitId) });
    const raw = await callTool({ system: SYSTEM, tool: TOOL, maxTokens: 6000, content, apiKey: userKeyFrom(req) });
    return Response.json({ result: normalizeMap(raw, { forcedUnitId }) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
