"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/schemas";
import { loadWorksheet } from "@/lib/client/storage";
import { WorksheetView } from "./WorksheetView";

/** 방금 만든 학습지를 세션에서 불러온다. 없으면 샘플을 보여 준다. */
export function WorksheetLoader({ sample }: { sample: AnalysisResult }) {
  const [state, setState] = useState<{ data: AnalysisResult; isSample: boolean } | null>(null);

  useEffect(() => {
    const wantSample = new URLSearchParams(window.location.search).has("sample");
    const saved = wantSample ? null : loadWorksheet();
    setState(saved ? { data: saved, isSample: false } : { data: sample, isSample: true });
  }, [sample]);

  if (!state) return <p className="p-10 text-center text-slate-500">불러오는 중…</p>;

  return (
    <>
      {state.isSample && (
        <p className="no-print bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">
          샘플 학습지입니다. <Link href="/" className="font-semibold underline">틀린 문제 사진을 올려</Link> 나만의 학습지를 만들어 보세요.
        </p>
      )}
      <WorksheetView data={state.data} />
    </>
  );
}
