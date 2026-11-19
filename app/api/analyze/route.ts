import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, imageBlock, userKeyFrom } from "@/lib/ai/client";
import { analyzeSystem, analyzeUserText } from "@/lib/ai/prompts";
import { buildAnalyzeTool } from "@/lib/ai/tools";
import { normalizeAnalysis } from "@/lib/ai/analyze";
import { withRetry } from "@/lib/ai/retry";
import { toErrorResponse } from "@/lib/ai/http";
import { curriculum, getUnit } from "@/lib/curriculum";
import { RecognizedProblemSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

const BodySchema = z.object({
  problem: RecognizedProblemSchema,
  image: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/).max(7_000_000).optional(),
  forcedUnitId: z.string().refine((id) => !!getUnit(id), "없는 단원입니다.").optional(),
});

const SYSTEM = analyzeSystem(curriculum);
const TOOL = buildAnalyzeTool(curriculum);

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { problem, image, forcedUnitId } = body.data;

  const apiKey = userKeyFrom(req);
  try {
    const content: Anthropic.ContentBlockParam[] = [];
    if (image) content.push(imageBlock(image));
    content.push({ type: "text", text: analyzeUserText(problem, forcedUnitId) });

    const result = await withRetry(async () =>
      normalizeAnalysis(await callTool({ system: SYSTEM, tool: TOOL, maxTokens: 16000, content, apiKey }), { forcedUnitId }),
    );
    return Response.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
