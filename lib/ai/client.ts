import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiConfigError, AiOutputError } from "./errors";

export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

let serverClient: Anthropic | null = null;

/** 브라우저에서 사용자가 입력한 키를 보낼 때 쓰는 요청 헤더 */
export const USER_KEY_HEADER = "x-user-api-key";

/** 요청에서 사용자 키를 꺼낸다(형식이 맞을 때만). */
export function userKeyFrom(req: Request): string | undefined {
  const key = req.headers.get(USER_KEY_HEADER)?.trim();
  return key && /^sk-ant-[\w-]{20,}$/.test(key) ? key : undefined;
}

export function hasServerKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * 서버 환경 변수 키가 있으면 그것을, 없으면 사용자가 화면에서 입력한 키를 쓴다.
 * 사용자 키는 이 요청에만 쓰고 서버에 저장하지 않는다.
 */
function getClient(userKey?: string): Anthropic {
  if (process.env.ANTHROPIC_API_KEY) {
    serverClient ??= new Anthropic();
    return serverClient;
  }
  if (userKey) return new Anthropic({ apiKey: userKey });
  throw new AiConfigError("API 키가 없습니다. 화면 위쪽 ⚙ 설정에서 Claude API 키를 입력해 주세요.");
}

export type UserContent = Anthropic.MessageParam["content"];
export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/** data URL을 Claude 이미지 블록으로 바꾼다. */
export function imageBlock(dataUrl: string): Anthropic.ImageBlockParam {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/.exec(dataUrl);
  if (!match) throw new AiConfigError("지원하지 않는 이미지 형식입니다.");
  return { type: "image", source: { type: "base64", media_type: match[1] as ImageMediaType, data: match[2] } };
}

/**
 * 지정한 tool 하나를 반드시 호출하게 해서 JSON 구조화 출력을 받는다.
 * 반환값은 검증 전 데이터이므로 호출 측에서 zod로 검증해야 한다.
 */
export async function callTool(opts: {
  system: string;
  content: UserContent;
  tool: Anthropic.Tool;
  maxTokens: number;
  /** 사용자가 입력한 API 키 (서버 키가 없을 때만 쓰임) */
  apiKey?: string;
}): Promise<unknown> {
  const res = await getClient(opts.apiKey).messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens,
    system: opts.system,
    tools: [opts.tool],
    tool_choice: { type: "tool", name: opts.tool.name },
    messages: [{ role: "user", content: opts.content }],
  });
  if (res.stop_reason === "max_tokens") throw new AiOutputError("AI 응답이 너무 길어 잘렸습니다.");
  const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new AiOutputError("AI가 구조화된 응답을 반환하지 않았습니다.");
  return block.input;
}
