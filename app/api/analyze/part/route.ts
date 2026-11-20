import { z } from "zod";
import { callTool, userKeyFrom } from "@/lib/ai/client";
import { partSystem, partUserText, type AnalyzePart } from "@/lib/ai/prompts";
import { checkTool, conceptTool, twinsTool } from "@/lib/ai/tools";
import { CheckPartSchema, ConceptPartSchema, MapPartSchema, TwinsPartSchema } from "@/lib/ai/analyze";
import { toErrorResponse } from "@/lib/ai/http";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { RecognizedProblemSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  part: z.enum(["twins", "concept", "check1", "check2"]),
  problem: RecognizedProblemSchema,
  map: MapPartSchema,
});

const PARTS = {
  twins: { tool: twinsTool, schema: TwinsPartSchema },
  concept: { tool: conceptTool, schema: ConceptPartSchema },
  check1: { tool: checkTool, schema: CheckPartSchema },
  check2: { tool: checkTool, schema: CheckPartSchema },
} as const;

/** 학습지 만들기 2단계: 쌍둥이 문제 / 개념 설명 / 확인 문제(쉬움·적용)를 각각 따로 만든다. */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { part, problem, map } = body.data;
  const unit = getUnit(map.mapping.unitId);
  const unitLabel = unit ? `${semesterLabel(unit.grade, unit.semester)} ${unit.title}` : map.mapping.unitId;

  try {
    const { tool, schema } = PARTS[part as AnalyzePart];
    const raw = await callTool({
      system: partSystem(part),
      tool,
      maxTokens: 6000,
      content: partUserText(problem, map, unitLabel),
      apiKey: userKeyFrom(req),
    });
    return Response.json({ result: schema.parse(raw) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
