import { describe, expect, it } from "vitest";
import { extractJson } from "@/lib/ai/json";

describe("extractJson (도구 대신 글로 JSON이 온 경우)", () => {
  it("코드 블록 속 JSON", () => expect(extractJson('결과입니다\n```json\n{"a":1}\n```')).toEqual({ a: 1 }));
  it("앞뒤 설명이 붙은 JSON", () => expect(extractJson('다음과 같습니다: {"quality":"good","problems":[]} 끝')).toEqual({ quality: "good", problems: [] }));
  it("JSON이 없으면 undefined", () => expect(extractJson("죄송합니다")).toBeUndefined());
});
