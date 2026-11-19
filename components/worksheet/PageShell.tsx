import type { ReactNode } from "react";

/** A4 한 장. 인쇄 시 페이지마다 나뉜다(globals.css의 .sheet 참고). */
export function PageShell({ title, unitLabel, page, children }: { title: string; unitLabel: string; page: number; children: ReactNode }) {
  return (
    <section className="sheet">
      <header className="mb-5 flex items-end justify-between border-b-2 border-slate-800 pb-2">
        <div>
          <p className="text-xs text-slate-500">{unitLabel}</p>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <div className="flex gap-4 text-sm">
          <span>날짜: ________</span>
          <span>이름: ____________</span>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-4 text-center text-xs text-slate-400">— {page} —</footer>
    </section>
  );
}
