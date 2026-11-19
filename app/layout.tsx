import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "오답 쌍둥이 문제 학습지",
  description: "틀린 중학교 수학 문제 사진으로 쌍둥이 문제·개념 설명·확인 문제 학습지를 만듭니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
