import { z } from "zod";
import { callTool, userKeyFrom } from "@/lib/ai/client";
import { GRADE_SUMMARY_SYSTEM, gradeSummaryUserText } from "@/lib/ai/prompts";
import { gradeSummaryTool } from "@/lib/ai/tools";
import { GradeSummarySchema } from "@/lib/ai/grade";
import { toErrorResponse } from "@/lib/ai/http";
import { AnalysisResultSchema, GradeItemSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ worksheet: AnalysisResultSchema, items: z.array(GradeItemSchema) });

/** 채점 마지막 단계: 문제별 결과를 보고 총평·다음 공부를 쓴다(사진 없이 짧게). */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    const raw = await callTool({
      system: GRADE_SUMMARY_SYSTEM,
      tool: gradeSummaryTool,
      maxTokens: 2000,
      content: gradeSummaryUserText(body.data.worksheet, body.data.items),
      apiKey: userKeyFrom(req),
    });
    return Response.json({ result: GradeSummarySchema.parse(raw) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
