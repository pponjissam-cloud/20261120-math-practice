import type { AnalysisResult } from "@/lib/schemas";

export type ExportRequest = { worksheet: AnalysisResult; code?: string; includeAnswers: boolean };

/** Content-Disposition의 filename*=UTF-8''… 에서 한글 파일명을 꺼낸다. */
function fileNameFrom(res: Response, fallback: string): string {
  const cd = res.headers.get("Content-Disposition") ?? "";
  const m = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  return m ? decodeURIComponent(m[1]) : fallback;
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function post(url: string, body: ExportRequest): Promise<Response> {
  try {
    return await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("서버에 연결할 수 없습니다.");
  }
}

/** Word 다운로드. 돌려주는 값: 수식이 Word 수식으로 들어갔으면 "pandoc", 글자로 들어갔으면 "basic" */
export async function downloadDocx(req: ExportRequest): Promise<"pandoc" | "basic"> {
  const res = await post("/api/export/docx", req);
  if (!res.ok) throw new Error("Word 파일을 만들지 못했습니다.");
  saveBlob(await res.blob(), fileNameFrom(res, "학습지.docx"));
  return res.headers.get("X-Docx-Engine") === "basic" ? "basic" : "pandoc";
}

/** PDF 다운로드. 서버에서 만들 수 없으면 "print"를 돌려주고, 호출 측이 인쇄 창을 연다. */
export async function downloadPdf(req: ExportRequest): Promise<"downloaded" | "print"> {
  const res = await post("/api/export/pdf", req);
  if (res.status === 501) return "print";
  if (!res.ok) throw new Error("PDF 파일을 만들지 못했습니다.");
  saveBlob(await res.blob(), fileNameFrom(res, "학습지.pdf"));
  return "downloaded";
}
