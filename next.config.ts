import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 서버 전용 무거운 패키지는 번들에 넣지 않는다(playwright를 번들하면 빌드가 깨지는 경우가 많음)
  serverExternalPackages: ["playwright", "playwright-core", "docx"],
  env: {
    // 화면에 배포 버전을 보여 주기 위함 (Netlify는 빌드 때 COMMIT_REF를 넣어 준다)
    NEXT_PUBLIC_APP_VERSION: (process.env.COMMIT_REF || process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7),
  },
};

export default nextConfig;
