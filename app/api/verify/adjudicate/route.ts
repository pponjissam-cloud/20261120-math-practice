import { z } from "zod";
import { userKeyFrom } from "@/lib/ai/client";
import { adjudicateWithAi } from "@/lib/ai/verify";
import { toErrorResponse } from "@/lib/ai/http";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  target: z.object({ id: z.string(), text: z.string().min(1), choices: z.array(z.string()).optional(), answer: z.string(), solution: z.string() }),
  solved: z.object({ answer: z.string(), solution: z.string() }),
});

/** 정답 검증: 정답지와 따로 푼 답이 다를 때 어느 쪽이 맞는지 판정한다. */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  try {
    return Response.json({ result: await adjudicateWithAi(body.data.target, body.data.solved, userKeyFrom(req)) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
