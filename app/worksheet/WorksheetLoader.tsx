"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalysisResult } from "@/lib/schemas";
import { getCurrentWorksheet, getWorksheet, setCurrentWorksheet, updateWorksheet } from "@/lib/client/storage";
import { WorksheetView } from "./WorksheetView";

/** ?id=코드 → 그 학습지, 없으면 마지막 학습지, 그것도 없거나 ?sample=1이면 샘플. ?answers=1이면 정답지 포함으로 시작. */
export function WorksheetLoader({ sample }: { sample: AnalysisResult }) {
  const [state, setState] = useState<{ data: AnalysisResult; code?: string; answers: boolean; autoVerify?: boolean } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const answers = params.get("answers") === "1";
    if (params.has("sample")) {
      setState({ data: sample, answers });
      return;
    }
    const id = params.get("id");
    const saved = id ? getWorksheet(id) : getCurrentWorksheet();
    if (saved) {
      setCurrentWorksheet(saved.id);
      setState({ data: saved.data, code: saved.id, answers, autoVerify: params.get("verify") === "1" });
    } else {
      setState({ data: sample, answers });
    }
  }, [sample]);

  if (!state) return <p className="p-10 text-center text-slate-500">불러오는 중…</p>;

  const code = state.code;
  return (
    <>
      {!code && (
        <p className="no-print bg-amber-100 px-6 py-2 text-center text-sm text-amber-900">
          샘플 학습지입니다. <Link href="/" className="font-semibold underline">틀린 문제 사진을 올려</Link> 나만의 학습지를 만들어 보세요.
        </p>
      )}
      <WorksheetView
        key={code ?? "sample"}
        data={state.data}
        code={code}
        initialIncludeAnswers={state.answers}
        autoVerify={state.autoVerify}
        onChange={code ? (data) => { updateWorksheet(code, data); setState((prev) => (prev ? { ...prev, data } : prev)); } : undefined}
      />
    </>
  );
}
