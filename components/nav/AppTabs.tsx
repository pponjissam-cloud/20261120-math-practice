"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "📷 틀린 문제 올리기" },
  { href: "/worksheet", label: "📄 학습지" },
  { href: "/grade", label: "✅ 채점·풀이 설명" },
];

export function AppTabs() {
  const pathname = usePathname();
  return (
    <nav className="no-print border-b border-slate-300 bg-white" aria-label="메뉴">
      <ul className="mx-auto flex max-w-4xl">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={`block border-b-4 px-2 py-3 text-center text-sm font-semibold ${active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
