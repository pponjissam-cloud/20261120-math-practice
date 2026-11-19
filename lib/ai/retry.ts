import { ZodError } from "zod";
import { AiOutputError } from "./errors";

const isRetryable = (e: unknown) => e instanceof ZodError || e instanceof AiOutputError;

/** 형식 오류일 때만 retries번 다시 시도한다. 네트워크·설정 오류는 바로 던진다. */
export async function withRetry<T>(fn: () => Promise<T>, retries = 1, shouldRetry = isRetryable): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (!shouldRetry(e)) throw e;
    }
  }
  throw lastError;
}
