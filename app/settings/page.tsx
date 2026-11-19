import { ApiKeyPanel } from "@/components/settings/ApiKeyPanel";
import { APP_VERSION } from "@/lib/version";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <ApiKeyPanel />
      <p className="mt-6 text-xs text-slate-400">앱 버전 {APP_VERSION}</p>
    </main>
  );
}
