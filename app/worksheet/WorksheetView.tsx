"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/schemas";
import { Worksheet } from "@/components/worksheet/Worksheet";

export function WorksheetView({ data, code }: { data: AnalysisResult; code?: string }) {
  // 학생이 풀 학습지는 정답지를 빼고 인쇄하는 경우가 많으므로 기본값은 "포함 안 함"
  const [includeAnswers, setIncludeAnswers] = useState(false);

  return (
    <>
      <div className="no-print sticky top-0 z-10 mb-6 flex flex-wrap items-center gap-4 bg-white/95 px-6 py-3 shadow">
        {code && <span className="text-sm">학습지 코드 <b className="font-mono">{code}</b></span>}
        {code && (
          <Link href={`/grade?id=${code}`} className="text-sm text-blue-700 underline">다 풀었으면 채점하기 →</Link>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} />
          정답지 포함
        </label>
        <button type="button" disabled title="Phase 3에서 연결" className="rounded border px-3 py-1.5 text-sm text-slate-400">Word 다운로드</button>
        <button type="button" disabled title="Phase 3에서 연결" className="rounded border px-3 py-1.5 text-sm text-slate-400">PDF 다운로드</button>
        <button type="button" onClick={() => window.print()} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">
          인쇄 / PDF로 저장
        </button>
      </div>
      <Worksheet data={data} includeAnswers={includeAnswers} code={code} />
    </>
  );
}
