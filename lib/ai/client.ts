import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AiConfigError, AiOutputError } from "./errors";

export const MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiConfigError("서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요.");
  }
  client ??= new Anthropic();
  return client;
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
}): Promise<unknown> {
  const res = await getClient().messages.create({
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
