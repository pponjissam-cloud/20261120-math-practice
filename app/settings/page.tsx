import { ApiKeyPanel } from "@/components/settings/ApiKeyPanel";

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <ApiKeyPanel />
    </main>
  );
}
