import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { callTool, imageBlock, userKeyFrom } from "@/lib/ai/client";
import { GRADE_SYSTEM, gradeUserText } from "@/lib/ai/prompts";
import { buildGradeItemsTool } from "@/lib/ai/tools";
import { normalizeGradeItems } from "@/lib/ai/grade";
import { toErrorResponse } from "@/lib/ai/http";
import { gradableProblems } from "@/lib/grade";
import { AnalysisResultSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const ImageSchema = z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/, "이미지 형식이 올바르지 않습니다.").max(7_000_000, "사진이 너무 큽니다.");

const BodySchema = z.object({
  worksheet: AnalysisResultSchema,
  images: z.array(ImageSchema).min(1, "풀이 사진을 올려 주세요.").max(4, "사진은 4장까지 올릴 수 있습니다."),
  /** 이번 요청에서 채점할 문제(T1, C2 …). 실행 시간 제한 때문에 몇 문제씩 나눠 채점한다. */
  problemIds: z.array(z.string()).min(1).max(7),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { worksheet, images } = body.data;
  const valid = new Set(gradableProblems(worksheet).map((p) => p.id));
  const ids = body.data.problemIds.filter((id) => valid.has(id));
  if (ids.length === 0) return Response.json({ error: "채점할 문제가 없습니다." }, { status: 400 });

  try {
    const content: Anthropic.ContentBlockParam[] = [...images.map(imageBlock), { type: "text", text: gradeUserText(worksheet, ids) }];
    const raw = await callTool({ system: GRADE_SYSTEM, tool: buildGradeItemsTool(ids), maxTokens: 8000, content, apiKey: userKeyFrom(req) });
    return Response.json({ result: normalizeGradeItems(raw, worksheet, ids) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
