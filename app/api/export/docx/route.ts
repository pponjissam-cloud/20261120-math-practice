import { z } from "zod";
import { AnalysisResultSchema } from "@/lib/schemas";
import { buildBlocks } from "@/lib/export/blocks";
import { exportContext, exportFileName } from "@/lib/export/context";
import { toMarkdown } from "@/lib/export/markdown";
import { PandocMissingError, markdownToDocx } from "@/lib/export/pandoc";
import { blocksToBasicDocx } from "@/lib/export/docx-basic";

export const runtime = "nodejs";

const BodySchema = z.object({
  worksheet: AnalysisResultSchema,
  code: z.string().max(10).optional(),
  includeAnswers: z.boolean().default(false),
});

const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { worksheet, code, includeAnswers } = body.data;

  const blocks = buildBlocks(worksheet, exportContext(worksheet, { code, includeAnswers }));
  let buffer: Buffer;
  let engine: "pandoc" | "basic" = "pandoc";
  try {
    buffer = await markdownToDocx(toMarkdown(blocks));
  } catch (err) {
    // pandoc이 없거나 변환에 실패하면 수식을 일반 글자로 넣는 기본 방식으로 만든다
    if (!(err instanceof PandocMissingError)) console.error(err);
    engine = "basic";
    buffer = await blocksToBasicDocx(blocks);
  }

  const name = exportFileName(worksheet, "docx");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": DOCX_TYPE,
      "Content-Disposition": `attachment; filename="worksheet.docx"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Docx-Engine": engine,
    },
  });
}
