import type Anthropic from "@anthropic-ai/sdk";
import type { Curriculum } from "@/lib/schemas";

// tool input_schema(JSON Schema). lib/schemas.ts의 zod 스키마와 모양을 맞춰야 한다.

const figure = {
  type: "object",
  description:
    "도형이 있을 때만. 좌표는 수학 좌표계(y 위쪽), 대략적인 비율이면 충분. 입체도형은 그림(겨냥도)에 보이는 2D 위치를 그대로 쓰고, 보이는 모서리는 segments, 점선 모서리는 dashed에 넣는다.",
  properties: {
    type: { type: "string", enum: ["triangle", "polygon", "circle", "coordinate", "solid"] },
    points: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, x: { type: "number" }, y: { type: "number" } },
        required: ["label", "x", "y"],
      },
    },
    segments: { type: "array", items: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 }, description: '예: [["A","B"],["B","C"]]' },
    dashed: { type: "array", items: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 2 } },
    labels: {
      type: "array",
      items: { type: "object", properties: { text: { type: "string" }, at: { type: "string" } }, required: ["text", "at"] },
    },
    circle: {
      type: "object",
      properties: { cx: { type: "number" }, cy: { type: "number" }, r: { type: "number" } },
      required: ["cx", "cy", "r"],
    },
  },
  required: ["type"],
};

const problem = {
  type: "object",
  properties: {
    text: { type: "string", description: "문제 본문. 수식은 $...$ LaTeX" },
    choices: { type: "array", items: { type: "string" }, description: "객관식 보기(번호 기호 제외). 주관식이면 생략" },
    answer: { type: "string" },
    solution: { type: "string", description: "중학생이 따라올 수 있는 단계별 풀이" },
    difficulty: { type: "integer", enum: [1, 2, 3] },
    figure,
  },
  required: ["text", "answer", "solution", "difficulty"],
};

export const recognizeTool: Anthropic.Tool = {
  name: "report_recognized_problems",
  description: "사진에서 읽어 낸 수학 문제를 보고한다.",
  input_schema: {
    type: "object",
    properties: {
      quality: { type: "string", enum: ["good", "blurry", "no_problem"] },
      note: { type: "string", description: "흐림·잘림 등 사용자에게 알릴 점" },
      problems: {
        type: "array",
        items: {
          type: "object",
          properties: {
            number: { type: "string", description: "문제 번호가 보이면" },
            text: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
            figure,
            studentWork: { type: "string", description: "학생이 쓴 풀이·답·채점 표시" },
          },
          required: ["text"],
        },
      },
    },
    required: ["quality", "problems"],
  },
};

export const solveTool: Anthropic.Tool = {
  name: "report_solution",
  description: "문제를 직접 풀어 최종 답과 풀이를 보고한다.",
  input_schema: {
    type: "object",
    properties: {
      solution: { type: "string", description: "단계별 풀이(먼저 쓴다)" },
      answer: { type: "string", description: "최종 답만. 객관식이면 보기 번호 기호로 시작(예: ③ $x=2$)" },
    },
    required: ["solution", "answer"],
  },
};

export const adjudicateTool: Anthropic.Tool = {
  name: "report_verdict",
  description: "정답지의 답과 다시 푼 답 중 무엇이 맞는지 판정한다.",
  input_schema: {
    type: "object",
    properties: {
      reasoning: { type: "string", description: "직접 다시 계산한 과정" },
      verdict: {
        type: "string",
        enum: ["key_correct", "key_wrong", "unsure"],
        description: "key_correct: 정답지가 맞음(두 답이 같은 값인 경우 포함) / key_wrong: 정답지가 틀렸고 바른 답을 확신함 / unsure: 문제 조건이 부족하거나 확신할 수 없음",
      },
      answer: { type: "string", description: "key_wrong일 때 바른 최종 답" },
      solution: { type: "string", description: "key_wrong일 때 바른 단계별 풀이" },
      note: { type: "string", description: "선생님께 알릴 점 1문장" },
    },
    required: ["reasoning", "verdict"],
  },
};

/** 학습지 풀이 사진 채점. problemId는 학습지에 실제로 있는 문제만 고르게 한다. */
export function buildGradeTool(problemIds: string[]): Anthropic.Tool {
  return {
    name: "report_grading",
    description: "학생이 학습지에 직접 푼 풀이를 채점하고 첨삭한 결과를 보고한다.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problemId: { type: "string", enum: problemIds },
              status: { type: "string", enum: ["correct", "partial", "wrong", "blank", "not_found"] },
              studentAnswer: { type: "string", description: "학생이 쓴 최종 답(LaTeX)" },
              studentWork: { type: "string", description: "학생 손글씨 풀이를 줄 단위로 옮긴 것(LaTeX, 줄바꿈 \\n)" },
              errorStep: { type: "string", description: "처음 틀린 줄과 무엇이 왜 틀렸는지. 맞았으면 생략" },
              feedback: { type: "string", description: "학생에게 하는 말 1~2문장" },
              explanation: { type: "string", description: "단계별 바른 풀이(줄바꿈 \\n)" },
              tip: { type: "string", description: "기억할 개념 한 줄" },
            },
            required: ["problemId", "status", "feedback", "explanation"],
          },
        },
        summary: { type: "string", description: "전체 총평 2~3문장" },
        nextStep: { type: "string", description: "다음에 무엇을 공부하면 좋을지" },
        photoNote: { type: "string", description: "사진이 흐림·잘림, 정답지가 의심스러움 등 알릴 점" },
      },
      required: ["items", "summary", "nextStep"],
    },
  };
}

/** 단원 id를 교육과정 목록 안에서만 고르도록 enum으로 제한한다. */
export function buildAnalyzeTool(data: Curriculum): Anthropic.Tool {
  const unitIds = data.units.map((u) => u.id);
  return {
    name: "create_worksheet",
    description: "오답 분석 결과와 학습지 내용을 만든다.",
    input_schema: {
      type: "object",
      properties: {
        original: {
          type: "object",
          properties: {
            text: { type: "string" },
            choices: { type: "array", items: { type: "string" } },
            answer: { type: "string" },
            solution: { type: "string" },
            figure,
          },
          required: ["text", "answer", "solution"],
        },
        mapping: {
          type: "object",
          properties: {
            unitId: { type: "string", enum: unitIds },
            subtopic: { type: "string", description: "선택한 단원의 subtopics 중 하나" },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reason: { type: "string", description: "판단 근거 1문장" },
            relatedUnitIds: { type: "array", items: { type: "string", enum: unitIds } },
            candidates: {
              type: "array",
              maxItems: 3,
              description: "confidence가 0.8 미만일 때 다른 후보 단원",
              items: {
                type: "object",
                properties: { unitId: { type: "string", enum: unitIds }, confidence: { type: "number", minimum: 0, maximum: 1 } },
                required: ["unitId", "confidence"],
              },
            },
          },
          required: ["unitId", "subtopic", "confidence", "reason", "relatedUnitIds"],
        },
        errorPoint: { type: "string" },
        twins: { type: "array", items: problem, minItems: 2, maxItems: 2 },
        concept: {
          type: "object",
          properties: {
            title: { type: "string" },
            summary: { type: "string" },
            keyFormulas: { type: "array", items: { type: "string" } },
            commonMistakes: { type: "array", items: { type: "string" } },
            example: problem,
          },
          required: ["title", "summary", "keyFormulas", "commonMistakes", "example"],
        },
        checkProblems: { type: "array", items: problem, minItems: 3, maxItems: 5 },
      },
      required: ["original", "mapping", "errorPoint", "twins", "concept", "checkProblems"],
    },
  };
}
