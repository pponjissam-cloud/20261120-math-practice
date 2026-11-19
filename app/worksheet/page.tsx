import sample from "@/tests/fixtures/sample-analysis.json";
import { AnalysisResultSchema } from "@/lib/schemas";
import { WorksheetLoader } from "./WorksheetLoader";

export default function WorksheetPage() {
  // 분석 결과가 없을 때(또는 ?sample=1) 보여 줄 샘플
  const fallback = AnalysisResultSchema.parse(sample);
  return <WorksheetLoader sample={fallback} />;
}
