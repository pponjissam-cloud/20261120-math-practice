import sample from "@/tests/fixtures/sample-analysis.json";
import { AnalysisResultSchema } from "@/lib/schemas";
import { WorksheetView } from "./WorksheetView";

export default function WorksheetPage() {
  // Phase 1: 픽스처 데이터. Phase 2부터 /api/analyze 결과로 교체한다.
  const data = AnalysisResultSchema.parse(sample);
  return <WorksheetView data={data} />;
}
