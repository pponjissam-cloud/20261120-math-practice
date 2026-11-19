import { hasServerKey } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 서버에 API 키가 설정돼 있는지만 알려 준다(키 값은 절대 보내지 않음). */
export function GET() {
  return Response.json({ serverKey: hasServerKey() });
}
