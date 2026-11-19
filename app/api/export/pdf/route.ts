import { z } from "zod";
import { AnalysisResultSchema } from "@/lib/schemas";
import { exportFileName } from "@/lib/export/context";
import { storageSnapshot } from "@/lib/client/storage";

export const runtime = "nodejs";

// playwright 타입에 의존하지 않도록 쓰는 부분만 정의한다(선택 설치 패키지라 없어도 빌드되게)
type Page = {
  goto(url: string, opts?: { waitUntil?: "networkidle"; timeout?: number }): Promise<unknown>;
  waitForSelector(sel: string, opts?: { timeout?: number }): Promise<unknown>;
  evaluate<T>(fn: () => T | Promise<T>): Promise<T>;
  emulateMedia(opts: { media: "print" }): Promise<void>;
  pdf(opts: { format: "A4"; printBackground: boolean; preferCSSPageSize: boolean }): Promise<Uint8Array>;
};
type Context = { addInitScript<A>(fn: (arg: A) => void, arg: A): Promise<void>; newPage(): Promise<Page> };
type Browser = { newContext(): Promise<Context>; close(): Promise<void> };
type Chromium = { launch(): Promise<Browser> };
export const maxDuration = 60;

const BodySchema = z.object({
  worksheet: AnalysisResultSchema,
  code: z.string().regex(/^[A-Z0-9]{1,10}$/).optional(),
  includeAnswers: z.boolean().default(false),
});

/**
 * 화면과 똑같은 학습지를 헤드리스 Chromium으로 열어 A4 PDF로 만든다.
 * 학습지는 브라우저 localStorage에만 있으므로, 헤드리스 브라우저에 미리 넣어 준 뒤 /worksheet 를 연다.
 * Playwright가 없으면 501 → 클라이언트가 브라우저 인쇄 창으로 대신한다.
 */
export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const { worksheet, includeAnswers } = body.data;
  const code = body.data.code ?? "PRINT";

  let chromium: Chromium;
  try {
    // 번들러가 playwright를 묶지 않도록 실행 시점에만 불러온다(설치돼 있지 않으면 인쇄 창으로 대체)
    const name = "playwright";
    ({ chromium } = (await import(/* webpackIgnore: true */ name)) as { chromium: Chromium });
  } catch {
    return Response.json({ error: "서버 PDF 생성을 쓸 수 없습니다.", fallback: "print" }, { status: 501 });
  }

  // 자기 자신의 학습지 화면만 연다(외부 주소로 나가지 않음)
  const base = process.env.APP_BASE_URL || new URL(req.url).origin;
  const target = `${base}/worksheet?id=${code}${includeAnswers ? "&answers=1" : ""}`;
  const snapshot = storageSnapshot({ id: code, createdAt: new Date().toISOString(), data: worksheet });

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext();
    await context.addInitScript((entries: Record<string, string>) => {
      for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v);
    }, snapshot);
    const page = await context.newPage();
    await page.goto(target, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForSelector(".sheet", { timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready.then(() => true));
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });

    const name = exportFileName(worksheet, "pdf");
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="worksheet.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "PDF를 만들지 못했습니다.", fallback: "print" }, { status: 501 });
  } finally {
    await browser?.close();
  }
}
