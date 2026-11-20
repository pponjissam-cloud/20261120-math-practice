import "server-only";
import { z } from "zod";
import { callTool } from "./client";
import { ADJUDICATE_SYSTEM, SOLVE_SYSTEM, adjudicateUserText, solveUserText } from "./prompts";
import { adjudicateTool, solveTool } from "./tools";
import type { Solved, Verdict, VerifyTarget } from "@/lib/verify/run";

const SolvedSchema = z.object({ answer: z.string().min(1), solution: z.string() });
const VerdictSchema = z.discriminatedUnion("verdict", [
  z.object({ verdict: z.literal("key_correct") }).passthrough(),
  z.object({ verdict: z.literal("key_wrong"), answer: z.string().min(1), solution: z.string().min(1), note: z.string().optional() }).passthrough(),
  z.object({ verdict: z.literal("unsure"), note: z.string().optional() }).passthrough(),
]);

/** apiKey: 사용자가 화면에서 입력한 키(서버 키가 없을 때만 쓰임) */
export async function solveWithAi(t: Omit<VerifyTarget, "answer" | "solution">, apiKey?: string): Promise<Solved> {
  return SolvedSchema.parse(await callTool({ system: SOLVE_SYSTEM, tool: solveTool, maxTokens: 6000, content: solveUserText(t), apiKey }));
}

export async function adjudicateWithAi(t: VerifyTarget, solved: Solved, apiKey?: string): Promise<Verdict> {
  const raw = VerdictSchema.parse(
    await callTool({ system: ADJUDICATE_SYSTEM, tool: adjudicateTool, maxTokens: 8000, content: adjudicateUserText(t, solved), apiKey }),
  );
  if (raw.verdict === "key_wrong") return { verdict: "key_wrong", answer: raw.answer, solution: raw.solution, note: raw.note };
  if (raw.verdict === "unsure") return { verdict: "unsure", note: raw.note };
  return { verdict: "key_correct" };
}
