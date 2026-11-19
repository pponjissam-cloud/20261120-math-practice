import { z } from "zod";
import { callTool, imageBlock, userKeyFrom } from "@/lib/ai/client";
import { RECOGNIZE_SYSTEM } from "@/lib/ai/prompts";
import { recognizeTool } from "@/lib/ai/tools";
import { normalizeRecognition } from "@/lib/ai/analyze";
import { withRetry } from "@/lib/ai/retry";
import { toErrorResponse } from "@/lib/ai/http";

export const runtime = "nodejs";
export const maxDuration = 60;

// base64로 약 7MB(원본 5MB)까지. 클라이언트가 2000px로 줄여 보내므로 보통 1MB 안팎이다.
const BodySchema = z.object({
  image: z.string().regex(/^data:image\/(jpeg|png|webp|gif);base64,/, "이미지 형식이 올바르지 않습니다.").max(7_000_000, "이미지가 너무 큽니다."),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: body.error.issues[0]?.message ?? "잘못된 요청입니다." }, { status: 400 });

  const apiKey = userKeyFrom(req);
  try {
    const result = await withRetry(async () =>
      normalizeRecognition(
        await callTool({
          system: RECOGNIZE_SYSTEM,
          tool: recognizeTool,
          maxTokens: 8000,
          apiKey,
          content: [imageBlock(body.data.image), { type: "text", text: "이 사진의 수학 문제를 읽어 주세요." }],
        }),
      ),
    );
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
