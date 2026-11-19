"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AnalysisResult, RecognizedProblem } from "@/lib/schemas";
import { resizeImage } from "@/lib/client/image";
import { analyze, recognize, verifySafe } from "@/lib/client/api";
import { saveWorksheet } from "@/lib/client/storage";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { LOW_CONFIDENCE } from "@/lib/ai/analyze";
import { MathText } from "@/components/math/MathText";
import { ApiKeyPanel } from "@/components/settings/ApiKeyPanel";

type Step = "upload" | "recognizing" | "review" | "analyzing" | "verifying" | "pickUnit";

const unitName = (id: string) => {
  const u = getUnit(id);
  return u ? `${semesterLabel(u.grade, u.semester)} ${u.title}` : id;
};

export function UploadFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [problems, setProblems] = useState<RecognizedProblem[]>([]);
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState<RecognizedProblem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [keyReady, setKeyReady] = useState(true);

  const finish = async (data: AnalysisResult) => {
    setStep("verifying");
    const verified = await verifySafe(data);
    const saved = saveWorksheet(verified);
    router.push(`/worksheet?id=${saved.id}`);
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setStep("recognizing");
    try {
      const dataUrl = await resizeImage(file);
      setImage(dataUrl);
      const rec = await recognize(dataUrl);
      if (rec.quality === "no_problem" || rec.problems.length === 0) {
        throw new Error(rec.note ?? "사진에서 수학 문제를 찾지 못했습니다. 문제가 잘 보이게 다시 찍어 주세요.");
      }
      if (rec.quality === "blurry") setNotice(rec.note ?? "사진이 흐려서 잘못 읽었을 수 있습니다. 아래 내용을 꼭 확인해 주세요.");
      setProblems(rec.problems);
      setSelected(0);
      setDraft(rec.problems[0]);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("upload");
    }
  }

  /** 인식이 실패했을 때: 사진은 분석에 참고용으로 남기고 문제 글은 직접 입력 */
  function typeManually() {
    setError(null);
    setProblems([]);
    setDraft({ text: "" });
    setNotice("사진에서 문제를 읽지 못해 직접 입력하는 화면입니다. 그림 내용은 사진을 참고해 분석합니다.");
    setStep("review");
  }

  function selectProblem(i: number) {
    setSelected(i);
    setDraft(problems[i]);
  }

  async function runAnalyze(forcedUnitId?: string) {
    if (!draft) return;
    setError(null);
    setStep("analyzing");
    try {
      const data = await analyze(draft, image ?? undefined, forcedUnitId);
      if (!forcedUnitId && data.mapping.confidence < LOW_CONFIDENCE) {
        setResult(data);
        setStep("pickUnit");
        return;
      }
      finish(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStep("review");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-bold">오답 쌍둥이 문제 학습지</h1>
      <p className="mb-8 text-slate-600">
        틀린 문제 사진을 올리면 교육과정 단원을 찾아 쌍둥이 문제 2개, 개념 설명, 개념 확인 문제, 교육과정 맵을 만들어 드립니다.
      </p>

      {step === "upload" && (
        <div className="mb-6">
          <ApiKeyPanel compact onReady={setKeyReady} />
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          <p>{error}</p>
          {step === "upload" && /API 키|키가/.test(error) && (
            <Link href="/settings" className="mt-1 inline-block font-semibold underline">⚙ 설정에서 API 키 확인하기</Link>
          )}
          {step === "upload" && image && !/API 키|키가/.test(error) && (
            <button type="button" onClick={typeManually} className="mt-2 block rounded border border-rose-300 bg-white px-3 py-1 font-semibold">
              ✏️ 사진은 그대로 두고 문제를 직접 입력하기
            </button>
          )}
        </div>
      )}

      {step === "upload" && (
        <>
          <div className={`mb-6 rounded-xl border-2 border-dashed border-slate-400 bg-white p-8 text-center ${keyReady ? "" : "pointer-events-none opacity-50"}`}>
            <p className="mb-1 text-lg">📷 틀린 문제 사진 올리기</p>
            <p className="mb-4 text-sm text-slate-500">한 문제가 크게 보이게 찍으면 가장 정확합니다.</p>
            <div className="flex justify-center gap-3">
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
                카메라로 찍기
                <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={!keyReady}
                  onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <label className="cursor-pointer rounded-lg border border-blue-600 px-4 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                앨범·파일에서 고르기
                <input type="file" accept="image/*" className="sr-only" disabled={!keyReady}
                  onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
            </div>
            {!keyReady && <p className="mt-3 text-sm text-rose-700">먼저 위에서 Claude API 키를 입력해 주세요.</p>}
          </div>
          <Link href="/worksheet?sample=1" className="block text-center text-sm text-slate-500 underline">샘플 학습지 미리보기</Link>
        </>
      )}

      {(step === "recognizing" || step === "analyzing" || step === "verifying") && (
        <div className="rounded-xl bg-white p-10 text-center" aria-live="polite">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-semibold">
            {step === "recognizing" ? "사진에서 문제를 읽고 있어요…" : step === "analyzing" ? "단원을 찾고 학습지를 만들고 있어요… (1/2)" : "만든 문제의 정답을 다시 풀어 확인하고 있어요… (2/2)"}
          </p>
          {step !== "recognizing" && <p className="mt-1 text-sm text-slate-500">1분 정도 걸릴 수 있습니다.</p>}
        </div>
      )}

      {step === "review" && draft && (
        <div className="space-y-5 rounded-xl bg-white p-6">
          {notice && <p className="rounded bg-amber-50 p-3 text-sm text-amber-800">{notice}</p>}

          {problems.length > 1 && (
            <fieldset>
              <legend className="mb-2 font-semibold">사진에 문제가 {problems.length}개 있어요. 틀린 문제를 골라 주세요.</legend>
              <div className="flex flex-wrap gap-2">
                {problems.map((p, i) => (
                  <button key={i} type="button" onClick={() => selectProblem(i)}
                    className={`rounded border px-3 py-1 text-sm ${i === selected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                    {p.number ? `${p.number}번` : `${i + 1}번째`}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="flex gap-4">
            {image && <img src={image} alt="올린 사진" className="h-40 w-auto rounded border object-contain" />}
            <div className="flex-1">
              <p className="mb-1 font-semibold">읽은 문제 (미리보기)</p>
              <div className="rounded bg-slate-50 p-3 leading-relaxed"><MathText text={draft.text} /></div>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">문제 내용 고치기 <span className="font-normal text-slate-500">(수식은 $...$ 안에 씁니다)</span></span>
            <textarea value={draft.text} rows={4} onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              className="w-full rounded border border-slate-300 p-2 font-mono text-sm" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">보기 <span className="font-normal text-slate-500">(한 줄에 하나, 주관식이면 비워 두세요)</span></span>
            <textarea value={(draft.choices ?? []).join("\n")} rows={3}
              onChange={(e) => {
                const choices = e.target.value.split("\n");
                setDraft({ ...draft, choices: choices.some((c) => c.trim()) ? choices : undefined });
              }}
              className="w-full rounded border border-slate-300 p-2 font-mono text-sm" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">학생 풀이·답 <span className="font-normal text-slate-500">(선택 — 어디서 틀렸는지 분석하는 데 쓰입니다)</span></span>
            <textarea value={draft.studentWork ?? ""} rows={2} onChange={(e) => setDraft({ ...draft, studentWork: e.target.value || undefined })}
              className="w-full rounded border border-slate-300 p-2 text-sm" />
          </label>

          <div className="flex gap-3">
            <button type="button" onClick={() => { setStep("upload"); setError(null); }} className="rounded border px-4 py-2">다시 찍기</button>
            <button type="button" disabled={!draft.text.trim()}
              onClick={() => runAnalyze()}
              className="flex-1 rounded bg-blue-600 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              분석 시작
            </button>
          </div>
        </div>
      )}

      {step === "pickUnit" && result && (
        <div className="space-y-4 rounded-xl bg-white p-6">
          <p className="font-semibold">이 문제가 어느 단원인지 확실하지 않아요. 맞는 단원을 골라 주세요.</p>
          <p className="text-sm text-slate-600">{result.mapping.reason}</p>
          <div className="space-y-2">
            <button type="button" onClick={() => finish(result)}
              className="block w-full rounded border-2 border-blue-600 p-3 text-left hover:bg-blue-50">
              <span className="font-semibold">{unitName(result.mapping.unitId)}</span> · {result.mapping.subtopic}
              <span className="ml-2 text-xs text-slate-500">(AI 추천 {Math.round(result.mapping.confidence * 100)}%)</span>
            </button>
            {result.mapping.candidates?.map((c) => (
              <button key={c.unitId} type="button" onClick={() => runAnalyze(c.unitId)}
                className="block w-full rounded border border-slate-300 p-3 text-left hover:bg-slate-50">
                {unitName(c.unitId)}
                <span className="ml-2 text-xs text-slate-500">({Math.round(c.confidence * 100)}% · 이 단원으로 다시 만들기)</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
