import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-2 text-2xl font-bold">오답 쌍둥이 문제 학습지</h1>
      <p className="mb-8 text-slate-600">
        틀린 문제 사진을 올리면 교육과정 단원을 찾아 쌍둥이 문제 2개, 개념 설명, 개념 확인 문제, 교육과정 맵을 만들어 드립니다.
      </p>

      <div className="mb-6 rounded-xl border-2 border-dashed border-slate-400 bg-white p-10 text-center text-slate-500">
        <p className="mb-3">📷 문제 사진 업로드</p>
        <input type="file" accept="image/*" capture="environment" disabled className="mx-auto block text-sm" />
        <p className="mt-3 text-xs">사진 분석 기능은 Phase 2에서 연결됩니다.</p>
      </div>

      <Link href="/worksheet" className="block rounded-lg bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700">
        샘플 학습지 미리보기
      </Link>
    </main>
  );
}
