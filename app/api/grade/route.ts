import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, imageBlock } from "@/lib/ai/client";
import { GRADE_SYSTEM, gradeUserText } from "@/lib/ai/prompts";
import { buildGradeTool } from "@/lib/ai/tools";
import { normalizeGrade } from "@/lib/ai/grade";
import { withRetry } from "@/lib/ai/retry";
import { toErrorResponse } from "@/lib/ai/http";
import { gradableProblems } from "@/lib/grade";
import { AnalysisResultSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 180;

const ImageSchema = z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/, "이미지 형식이 올바르지 않습니다.").max(7_000_000, "사진이 너무 큽니다.");

const BodySchema = z.object({
  worksheet: AnalysisResultSchema,
  images: z.array(ImageSchema).min(1, "풀이 사진을 올려 주세요.").max(4, "사진은 4장까지 올릴 수 있습니다."),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { worksheet, images } = body.data;

  try {
    const tool = buildGradeTool(gradableProblems(worksheet).map((p) => p.id));
    const content: Anthropic.ContentBlockParam[] = [
      ...images.map(imageBlock),
      { type: "text", text: gradeUserText(worksheet) },
    ];
    const result = await withRetry(async () =>
      normalizeGrade(await callTool({ system: GRADE_SYSTEM, tool, maxTokens: 12000, content }), worksheet),
    );
    return Response.json({ result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
