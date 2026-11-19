"use client";

import { useEffect, useState } from "react";
import { clearUserKey, fetchServerHasKey, getUserKey, isValidKeyFormat, maskKey, setUserKey } from "@/lib/client/apiKey";
import { checkConnection } from "@/lib/client/api";

/**
 * Claude API 키 상태 + 입력 창. 첫 화면과 ⚙ 설정에 항상 보인다.
 * - 서버(Netlify 환경 변수)에 키가 있으면: "서버 키 사용 중" 표시 + 연결 테스트
 * - 없으면: 이 브라우저에만 저장할 키 입력 창
 */
export function ApiKeyPanel({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<{ state: "idle" | "running" | "ok" | "fail"; text?: string }>({ state: "idle" });

  useEffect(() => {
    setSaved(getUserKey());
    fetchServerHasKey().then(setServerKey);
  }, []);

  useEffect(() => {
    if (serverKey !== null) onReady?.(serverKey || !!saved);
  }, [serverKey, saved, onReady]);

  function save() {
    if (!isValidKeyFormat(input)) {
      setError("키 형식이 맞지 않습니다. sk-ant- 로 시작하는 키 전체를 붙여 넣어 주세요.");
      return;
    }
    setUserKey(input);
    setSaved(input.trim());
    setInput("");
    setEditing(false);
    setError(null);
    setTest({ state: "idle" });
  }

  function remove() {
    clearUserKey();
    setSaved(null);
    setTest({ state: "idle" });
  }

  async function runTest() {
    setTest({ state: "running" });
    try {
      const r = await checkConnection();
      setTest({ state: "ok", text: `연결 성공 — ${(r.ms / 1000).toFixed(1)}초, 모델 ${r.model}${r.usingServerKey ? ", 서버 키 사용" : ""}` });
    } catch (e) {
      setTest({ state: "fail", text: e instanceof Error ? e.message : String(e) });
    }
  }

  const ready = !!serverKey || !!saved;
  const showInput = serverKey === false && (!saved || editing);

  return (
    <section className={`rounded-xl border-2 bg-white p-4 ${ready ? "border-emerald-200" : "border-rose-300"}`} aria-label="Claude API 키">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-bold">🔑 Claude API 키</span>
        {serverKey === null && <span className="text-slate-500">확인 중…</span>}
        {serverKey === true && <span className="text-emerald-800">서버(Netlify 환경 변수)에 설정된 키를 사용 중</span>}
        {serverKey === false && saved && !editing && (
          <>
            <span className="text-emerald-800">입력된 키 <code className="font-mono">{maskKey(saved)}</code></span>
            <button type="button" onClick={() => setEditing(true)} className="rounded border px-2 py-0.5 text-slate-600">바꾸기</button>
            <button type="button" onClick={remove} className="rounded border px-2 py-0.5 text-slate-600">지우기</button>
          </>
        )}
        {serverKey === false && !saved && <span className="font-semibold text-rose-700">아직 입력하지 않았습니다 — 키가 있어야 사진을 분석할 수 있어요</span>}
        {ready && (
          <button type="button" onClick={runTest} disabled={test.state === "running"} className="ml-auto rounded border border-blue-600 px-2 py-0.5 text-blue-700 disabled:opacity-50">
            {test.state === "running" ? "테스트 중…" : "연결 테스트"}
          </button>
        )}
      </div>

      {test.state === "ok" && <p className="mt-2 text-sm text-emerald-800">✅ {test.text}</p>}
      {test.state === "fail" && <p className="mt-2 text-sm text-rose-700">❌ {test.text}</p>}

      {showInput && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") save(); }}
              placeholder="sk-ant-api03-… 키를 여기에 붙여 넣기"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 rounded border border-slate-300 p-2 font-mono text-sm"
              aria-label="Claude API 키 입력"
            />
            <button type="button" onClick={() => setShow(!show)} className="rounded border px-2 text-sm">{show ? "숨기기" : "보기"}</button>
            <button type="button" onClick={save} disabled={!input.trim()} className="rounded bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">저장</button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <p className="mt-2 text-xs text-slate-500">
            키는 <b>이 브라우저에만 저장</b>되고, AI 요청 때만 서버를 거쳐 Anthropic으로 전달됩니다(서버에 저장하지 않음).
            발급: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">console.anthropic.com → API Keys</a> (결제 수단 등록·크레딧 충전 필요).
            여러 사람이 쓴다면 Netlify 환경 변수 <code>ANTHROPIC_API_KEY</code>에 넣는 것을 권장합니다.
          </p>
        </div>
      )}
    </section>
  );
}
