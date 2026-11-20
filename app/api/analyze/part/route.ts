import { z } from "zod";
import { callTool, userKeyFrom } from "@/lib/ai/client";
import { ANALYZE_PARTS, partSystem, partUserText } from "@/lib/ai/prompts";
import { conceptTool, problemTool } from "@/lib/ai/tools";
import { ConceptPartSchema, MapPartSchema, ProblemPartSchema, unwrapPart } from "@/lib/ai/analyze";
import { toErrorResponse } from "@/lib/ai/http";
import { AiOutputError } from "@/lib/ai/errors";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { RecognizedProblemSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  part: z.enum(ANALYZE_PARTS),
  problem: RecognizedProblemSchema,
  map: MapPartSchema,
});

const partSpec = (part: string) =>
  part === "concept" ? { tool: conceptTool, schema: ConceptPartSchema } : { tool: problemTool, schema: ProblemPartSchema };

/** 학습지 만들기 2단계: 쌍둥이 문제·확인 문제는 1개씩, 개념 설명은 따로 만든다. */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });
  const { part, problem, map } = body.data;
  const unit = getUnit(map.mapping.unitId);
  const unitLabel = unit ? `${semesterLabel(unit.grade, unit.semester)} ${unit.title}` : map.mapping.unitId;

  try {
    const { tool, schema } = partSpec(part);
    const raw = await callTool({
      system: partSystem(part),
      tool,
      maxTokens: 8000,
      content: partUserText(problem, map, unitLabel),
      apiKey: userKeyFrom(req),
    });
    const unwrapped = unwrapPart(part, raw);
    const parsed = schema.safeParse(unwrapped);
    if (!parsed.success) {
      // 무엇을 받았는지 함께 알려 원인을 찾을 수 있게 한다
      const issue = parsed.error.issues[0];
      const keys = raw && typeof raw === "object" ? Object.keys(raw).join(", ") : typeof raw;
      throw new AiOutputError(`${issue?.path.join(".")}: ${issue?.message} (받은 항목: ${keys})`);
    }
    return Response.json({ result: parsed.data });
  } catch (err) {
    return toErrorResponse(err);
  }
}
