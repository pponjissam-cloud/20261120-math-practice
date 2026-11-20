import { z } from "zod";
import { userKeyFrom } from "@/lib/ai/client";
import { solveWithAi } from "@/lib/ai/verify";
import { toErrorResponse } from "@/lib/ai/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({ target: z.object({ id: z.string(), text: z.string().min(1), choices: z.array(z.string()).optional() }) });

/** 정답 검증: 정답을 보여 주지 않고 문제 하나를 따로 풀게 한다. */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    return Response.json({ result: await solveWithAi(body.data.target, userKeyFrom(req)) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
