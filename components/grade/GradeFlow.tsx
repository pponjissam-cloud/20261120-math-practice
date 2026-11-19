"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GradeResult } from "@/lib/schemas";
import { getUnit, semesterLabel } from "@/lib/curriculum";
import { gradableProblems } from "@/lib/grade";
import { analyze, grade, verifySafe } from "@/lib/client/api";
import { resizeImage } from "@/lib/client/image";
import {
  getCurrentWorksheet, getWorksheet, listWorksheets, saveGrade, saveWorksheet, setCurrentWorksheet, type SavedWorksheet,
} from "@/lib/client/storage";
import { GradeReport } from "./GradeReport";

const MAX_PHOTOS = 4;

function describe(w: SavedWorksheet): string {
  const u = getUnit(w.data.mapping.unitId);
  const date = new Date(w.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return `${w.id} · ${u ? `${semesterLabel(u.grade, u.semester)} ${u.title}` : w.data.mapping.subtopic} · ${date}${w.grade ? " · 채점됨" : ""}`;
}

export function GradeFlow() {
  const router = useRouter();
  const [list, setList] = useState<SavedWorksheet[]>([]);
  const [current, setCurrent] = useState<SavedWorksheet | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [busy, setBusy] = useState<"photo" | "grading" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const w = (id && getWorksheet(id)) || getCurrentWorksheet();
    setList(listWorksheets());
    pick(w);
    setLoaded(true);
  }, []);

  function pick(w: SavedWorksheet | null) {
    setCurrent(w);
    setResult(w?.grade ?? null);
    setPhotos([]);
    setError(null);
    if (w) setCurrentWorksheet(w.id);
  }

  function findByCode() {
    const w = getWorksheet(codeInput);
    if (w) pick(w);
    else setError(`학습지 코드 ${codeInput.toUpperCase()}를 이 기기에서 찾지 못했습니다. 학습지를 만든 기기·브라우저에서 열어 주세요.`);
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy("photo");
    try {
      const room = MAX_PHOTOS - photos.length;
      if (files.length > room) setError(`사진은 ${MAX_PHOTOS}장까지 올릴 수 있어 앞의 ${room}장만 추가했습니다.`);
      const resized = await Promise.all(Array.from(files).slice(0, room).map((f) => resizeImage(f)));
      setPhotos((prev) => [...prev, ...resized]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function runGrade() {
    if (!current || photos.length === 0) return;
    setError(null);
    setBusy("grading");
    try {
      const r = await grade(current.data, photos);
      saveGrade(current.id, r);
      setResult(r);
      setList(listWorksheets());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function retryProblem(problemId: string) {
    if (!current) return;
    const p = gradableProblems(current.data).find((x) => x.id === problemId);
    if (!p) return;
    setError(null);
    setRetryingId(problemId);
    try {
      const item = result?.items.find((i) => i.problemId === problemId);
      const data = await analyze({
        text: p.problem.text,
        choices: p.problem.choices,
        figure: p.problem.figure,
        studentWork: item?.studentWork,
      });
      const saved = saveWorksheet(await verifySafe(data));
      router.push(`/worksheet?id=${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRetryingId(null);
    }
  }

  if (!loaded) return <p className="p-10 text-center text-slate-500">불러오는 중…</p>;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="no-print mb-2 text-2xl font-bold">채점·풀이 설명</h1>
      <p className="no-print mb-6 text-slate-600">인쇄한 학습지에 문제를 다 풀었으면 풀이가 보이게 사진을 찍어 올려 주세요. 문제마다 채점하고, 틀린 곳과 바른 풀이를 설명해 드립니다.</p>

      {error && <div role="alert" className="no-print mb-4 whitespace-pre-line break-words rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

      <section className="no-print mb-6 rounded-xl bg-white p-5 shadow-sm">
        <p className="mb-2 font-semibold">어떤 학습지를 풀었나요?</p>
        {list.length > 0 ? (
          <select value={current?.id ?? ""} onChange={(e) => pick(getWorksheet(e.target.value))}
            className="mb-3 w-full rounded border border-slate-300 p-2 text-sm">
            {list.map((w) => <option key={w.id} value={w.id}>{describe(w)}</option>)}
          </select>
        ) : (
          <p className="mb-3 text-sm text-slate-500">
            이 기기에 저장된 학습지가 없습니다. <Link href="/" className="text-blue-700 underline">먼저 틀린 문제로 학습지를 만들어</Link> 주세요.
          </p>
        )}
        <div className="flex gap-2 text-sm">
          <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="학습지 코드 (예: K7P2)"
            className="w-48 rounded border border-slate-300 p-2 font-mono uppercase" maxLength={4} />
          <button type="button" onClick={findByCode} disabled={codeInput.trim().length !== 4} className="rounded border px-3 disabled:opacity-50">찾기</button>
          <span className="self-center text-xs text-slate-500">코드는 학습지 각 페이지 위쪽에 인쇄되어 있어요.</span>
        </div>
      </section>

      {current && (
        <section className="no-print mb-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="mb-1 font-semibold">풀이 사진 올리기 <span className="text-sm font-normal text-slate-500">({photos.length}/{MAX_PHOTOS}장)</span></p>
          <p className="mb-3 text-sm text-slate-500">쌍둥이 문제 페이지와 개념 확인 문제 페이지를 각각 찍어 올리면 됩니다. 일부 페이지만 올려도 그 문제만 채점해요.</p>

          <div className="mb-3 flex flex-wrap gap-3">
            {photos.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`풀이 사진 ${i + 1}`} className="h-32 w-auto rounded border object-contain" />
                <button type="button" aria-label={`사진 ${i + 1} 삭제`} onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-slate-800 text-xs text-white">✕</button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-32 w-28 cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-slate-400 text-sm text-slate-500 hover:border-blue-500">
                {busy === "photo" ? "처리 중…" : <>📷<span>사진 추가</span></>}
                <input type="file" accept="image/*" multiple className="sr-only"
                  onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>

          <button type="button" onClick={runGrade} disabled={photos.length === 0 || busy !== null}
            className="w-full rounded bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy === "grading" ? "채점하고 풀이를 설명하는 중… (1분 정도 걸려요)" : result ? "다시 채점하기" : "채점하기"}
          </button>
        </section>
      )}

      {current && result && (
        <>
          <div className="no-print mb-3 flex justify-end">
            <button type="button" onClick={() => window.print()} className="rounded border px-3 py-1.5 text-sm">채점 결과 인쇄</button>
          </div>
          <GradeReport worksheet={current.data} result={result} onRetryProblem={retryProblem} retryingId={retryingId} />
        </>
      )}
    </main>
  );
}
