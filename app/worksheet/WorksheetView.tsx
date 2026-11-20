"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/schemas";
import { Worksheet } from "@/components/worksheet/Worksheet";
import { downloadDocx, downloadPdf } from "@/lib/client/download";
import { verifySafe } from "@/lib/client/api";

type Busy = "docx" | "pdf" | null;

export function WorksheetView({ data, code, initialIncludeAnswers = false, autoVerify = false, onChange }: {
  data: AnalysisResult;
  code?: string;
  /** 학생이 풀 학습지는 정답지를 빼고 인쇄하는 경우가 많으므로 기본값은 "포함 안 함" */
  initialIncludeAnswers?: boolean;
  /** 방금 만든 학습지면 화면을 보여 준 뒤 정답 검증을 자동으로 시작한다 */
  autoVerify?: boolean;
  /** 정답 검증 등으로 학습지가 바뀌었을 때 저장 */
  onChange?: (data: AnalysisResult) => void;
}) {
  const [verifying, setVerifying] = useState<{ done: number; total: number } | null>(null);
  const started = useRef(false);
  const [includeAnswers, setIncludeAnswers] = useState(initialIncludeAnswers);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ kind: "info" | "error"; text: string } | null>(null);

  async function run(kind: Exclude<Busy, null>, fn: () => Promise<void>) {
    setBusy(kind);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const req = { worksheet: data, code, includeAnswers };

  const onDocx = () => run("docx", async () => {
    const engine = await downloadDocx(req);
    if (engine === "basic") setMessage({ kind: "info", text: "서버에 pandoc이 없어 수식을 일반 글자로 넣었습니다. pandoc을 설치하면 Word에서 고칠 수 있는 수식으로 들어갑니다." });
  });

  const onPdf = () => run("pdf", async () => {
    const r = await downloadPdf(req);
    if (r === "print") {
      setMessage({ kind: "info", text: "서버 PDF 생성을 쓸 수 없어 인쇄 창을 열었습니다. 대상을 'PDF로 저장'으로 고르세요." });
      window.print();
    }
  });

  /** 정답 검증: 학습지를 보면서 기다릴 수 있도록 다른 버튼을 막지 않는다 */
  async function onVerify() {
    if (verifying || !onChange) return;
    setVerifying({ done: 0, total: 1 });
    try {
      const verified = await verifySafe(data, (done, total) => setVerifying({ done, total }));
      onChange(verified);
    } finally {
      setVerifying(null);
    }
  }

  useEffect(() => {
    if (autoVerify && !data.verification && onChange && !started.current) {
      started.current = true;
      void onVerify();
    }
    // 처음 한 번만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const v = data.verification;

  return (
    <>
      <div className="no-print sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-3 bg-white/95 px-6 py-3 shadow">
        {code && <span className="text-sm">학습지 코드 <b className="font-mono">{code}</b></span>}
        {code && <Link href={`/grade?id=${code}`} className="text-sm text-blue-700 underline">다 풀었으면 채점하기 →</Link>}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} />
          정답지 포함
        </label>
        <button type="button" onClick={onDocx} disabled={busy !== null} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">
          {busy === "docx" ? "만드는 중…" : "Word 다운로드"}
        </button>
        <button type="button" onClick={onPdf} disabled={busy !== null} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50">
          {busy === "pdf" ? "만드는 중…" : "PDF 다운로드"}
        </button>
        <button type="button" onClick={() => window.print()} disabled={busy !== null} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
          인쇄
        </button>
      </div>

      <div className="no-print mx-auto mb-6 max-w-[210mm] space-y-2 px-2 text-sm">
        {message && (
          <p role="status" className={`whitespace-pre-line break-words rounded p-3 ${message.kind === "error" ? "bg-rose-50 text-rose-800" : "bg-blue-50 text-blue-900"}`}>{message.text}</p>
        )}
        {v && !v.failed && v.review === 0 && (
          <p className="rounded bg-emerald-50 p-3 text-emerald-900">
            ✅ 정답 검증 완료 — {v.checked}문제를 다시 풀어 확인했습니다{v.corrected > 0 ? ` (정답 ${v.corrected}개를 고침)` : ""}.
          </p>
        )}
        {v && !v.failed && v.review > 0 && (
          <p className="rounded bg-amber-50 p-3 text-amber-900">
            ⚠ 정답 검증 — {v.checked}문제 중 {v.review}문제는 정답을 확신할 수 없습니다. "검토 필요" 표시된 문제의 정답을 확인해 주세요.
            {v.corrected > 0 && ` (정답 ${v.corrected}개를 고침)`}
          </p>
        )}
        {verifying && (
          <p className="flex items-center gap-3 rounded bg-blue-50 p-3 text-blue-900" role="status">
            <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <span className="flex-1">
              만든 문제의 정답을 다시 풀어 확인하고 있어요… ({verifying.done}/{verifying.total})
              <span className="block text-xs text-blue-700">학습지는 지금 봐도 됩니다. 인쇄·배포는 확인이 끝난 뒤를 권장해요.</span>
            </span>
          </p>
        )}
        {!verifying && (!v || v.failed) && (
          <p className="flex items-center gap-3 rounded bg-amber-50 p-3 text-amber-900">
            <span className="flex-1">{v?.failed ? "정답 검증을 하지 못했습니다." : "아직 정답 검증을 하지 않은 학습지입니다."} 인쇄 전에 검증하는 것을 권장합니다.</span>
            <button type="button" onClick={onVerify} disabled={!!verifying || !onChange} className="rounded bg-amber-600 px-3 py-1 font-semibold text-white disabled:opacity-50">
              정답 검증하기
            </button>
          </p>
        )}
      </div>

      <Worksheet data={data} includeAnswers={includeAnswers} code={code} />
    </>
  );
}
