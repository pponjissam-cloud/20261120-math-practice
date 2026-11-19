import "server-only";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

export class PandocMissingError extends Error {}

const REFERENCE_DOC = path.join(process.cwd(), "templates", "reference.docx");

/** Markdown → DOCX (pandoc 필요). 수식은 Word 네이티브 수식으로 들어간다. */
export function markdownToDocx(markdown: string, timeoutMs = 30_000): Promise<Buffer> {
  const args = ["-f", "markdown+tex_math_dollars+raw_attribute+bracketed_spans", "-t", "docx", "-o", "-"];
  if (existsSync(REFERENCE_DOC)) args.push("--reference-doc", REFERENCE_DOC);

  return new Promise((resolve, reject) => {
    const proc = spawn(process.env.PANDOC_PATH || "pandoc", args);
    const chunks: Buffer[] = [];
    let stderr = "";
    const timer = setTimeout(() => { proc.kill(); reject(new Error("pandoc 시간 초과")); }, timeoutMs);
    proc.stdout.on("data", (c: Buffer) => chunks.push(c));
    proc.stderr.on("data", (c: Buffer) => { stderr += c.toString(); });
    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(err.code === "ENOENT" ? new PandocMissingError("pandoc이 설치되어 있지 않습니다.") : err);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(Buffer.concat(chunks));
      else reject(new Error(`pandoc 변환 실패: ${stderr.slice(0, 300)}`));
    });
    proc.stdin.end(markdown, "utf8");
  });
}
