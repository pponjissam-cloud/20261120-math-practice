"use client";

import { useEffect, useState } from "react";
import { clearUserKey, fetchServerHasKey, getUserKey, isValidKeyFormat, maskKey, setUserKey } from "@/lib/client/apiKey";

/**
 * Claude API 키 입력 창.
 * 서버(Netlify 환경 변수 등)에 키가 있으면 입력할 필요가 없다고 알려 주고,
 * 없으면 이 브라우저에만 저장할 키를 받는다.
 */
export function ApiKeyPanel({ onReady, compact = false }: { onReady?: (ready: boolean) => void; compact?: boolean }) {
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
  }

  function remove() {
    clearUserKey();
    setSaved(null);
  }

  if (serverKey === null) return compact ? null : <p className="text-sm text-slate-500">설정 확인 중…</p>;

  if (serverKey && compact) return null;

  return (
    <section className="rounded-xl border-2 border-blue-200 bg-white p-5">
      <h2 className="mb-1 font-bold">🔑 Claude API 키</h2>

      {serverKey ? (
        <p className="text-sm text-emerald-800">서버에 API 키가 설정되어 있어 따로 입력하지 않아도 됩니다.</p>
      ) : saved ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-emerald-800">✅ 입력된 키: <code className="font-mono">{maskKey(saved)}</code></span>
          <button type="button" onClick={remove} className="rounded border px-2 py-1 text-slate-600 hover:bg-slate-50">키 지우기</button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-600">
            사진을 읽고 학습지를 만들려면 Claude API 키가 필요합니다. 키는 <b>이 브라우저에만 저장</b>되고,
            AI 요청을 보낼 때만 서버를 거쳐 Anthropic으로 전달됩니다(서버에 저장하지 않음).
          </p>
          <div className="flex gap-2">
            <input
              type={show ? "text" : "password"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save()}
              placeholder="sk-ant-api03-…"
              autoComplete="off"
              spellCheck={false}
              className="flex-1 rounded border border-slate-300 p-2 font-mono text-sm"
              aria-label="Claude API 키"
            />
            <button type="button" onClick={() => setShow(!show)} className="rounded border px-2 text-sm">{show ? "숨기기" : "보기"}</button>
            <button type="button" onClick={save} disabled={!input.trim()} className="rounded bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50">저장</button>
          </div>
          {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
          <p className="mt-3 text-xs text-slate-500">
            키 발급: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline">console.anthropic.com → API Keys</a>
            {" "}(결제 수단 등록·크레딧 충전 필요). 여러 사람이 쓰는 사이트라면 키를 화면에 넣는 대신 Netlify 환경 변수 <code>ANTHROPIC_API_KEY</code>에 넣는 것을 권장합니다.
          </p>
        </>
      )}
    </section>
  );
}
