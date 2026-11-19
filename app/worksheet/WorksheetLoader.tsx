"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/schemas";
import { getCurrentWorksheet, getWorksheet, setCurrentWorksheet } from "@/lib/client/storage";
import { WorksheetView } from "./WorksheetView";

/** ?id=코드 → 그 학습지, 없으면 마지막 학습지, 그것도 없거나 ?sample=1이면 샘플. */
export function WorksheetLoader({ sample }: { sample: AnalysisResult }) {
  const [state, setState] = useState<{ data: AnalysisResult; code?: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("sample")) return setState({ data: sample });
    const id = params.get("id");
    const saved = id ? getWorksheet(id) : getCurrentWorksheet();
    if (saved) {
      setCurrentWorksheet(saved.id);
      setState({ data: saved.data, code: saved.id });
    } else {
      setState({ data: sample });
    }
  }, [sample]);

  if (!state) return <p className="p-10 text-center text-slate-500">불러오는 중…</p>;

  return (
    <>
      {!state.code && (
        <p className="no-print bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">
          샘플 학습지입니다. <Link href="/" className="font-semibold underline">틀린 문제 사진을 올려</Link> 나만의 학습지를 만들어 보세요.
        </p>
      )}
      <WorksheetView data={state.data} code={state.code} />
    </>
  );
}
