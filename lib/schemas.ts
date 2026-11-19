import { z } from "zod";

/** 도형 명세. AI가 SVG를 직접 그리지 않고 이 데이터를 주면 FigureRenderer가 그린다. */
export const FigureSpecSchema = z.object({
  type: z.enum(["triangle", "polygon", "circle", "coordinate", "solid"]),
  points: z.array(z.object({ label: z.string(), x: z.number(), y: z.number() })).optional(),
  segments: z.array(z.tuple([z.string(), z.string()])).optional(),
  labels: z.array(z.object({ text: z.string(), at: z.string() })).optional(),
  circle: z.object({ cx: z.number(), cy: z.number(), r: z.number() }).optional(),
});

export const ProblemSchema = z.object({
  text: z.string().min(1),
  choices: z.array(z.string()).optional(),
  answer: z.string().min(1),
  solution: z.string().min(1),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  figure: FigureSpecSchema.optional(),
  /** Phase 3 정답 검증 루프 결과. true면 "검토 필요" 배지를 표시한다. */
  needsReview: z.boolean().optional(),
});

export const AnalysisResultSchema = z.object({
  original: z.object({
    text: z.string(),
    choices: z.array(z.string()).optional(),
    answer: z.string(),
    solution: z.string(),
    figure: FigureSpecSchema.optional(),
  }),
  mapping: z.object({
    unitId: z.string(),
    subtopic: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
    /** 신뢰도가 낮을 때 사용자에게 보여 줄 다른 후보 단원(최대 3개). */
    candidates: z.array(z.object({ unitId: z.string(), confidence: z.number().min(0).max(1) })).max(3).optional(),
    relatedUnitIds: z.array(z.string()),
  }),
  errorPoint: z.string(),
  twins: z.array(ProblemSchema).length(2),
  concept: z.object({
    title: z.string(),
    summary: z.string(),
    keyFormulas: z.array(z.string()),
    commonMistakes: z.array(z.string()),
    example: ProblemSchema,
  }),
  checkProblems: z.array(ProblemSchema).min(3).max(5),
});

export const UnitSchema = z.object({
  id: z.string().regex(/^M[1-3]-[12]-\d{2}$/),
  grade: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  semester: z.union([z.literal(1), z.literal(2)]),
  area: z.enum(["수와 연산", "변화와 관계", "도형과 측정", "자료와 가능성"]),
  title: z.string(),
  subtopics: z.array(z.string()).min(1),
  prerequisites: z.array(z.string()),
});

export const CurriculumSchema = z.object({
  version: z.string(),
  note: z.string(),
  units: z.array(UnitSchema),
});

/** 사진에서 읽어 낸 문제 한 개. 사용자가 확인·수정한 뒤 분석 단계로 넘긴다. */
export const RecognizedProblemSchema = z.object({
  number: z.string().optional(),
  text: z.string().min(1),
  choices: z.array(z.string()).optional(),
  figure: FigureSpecSchema.optional(),
  /** 학생이 쓴 풀이·답·채점 표시. 문제 본문과 분리한다. */
  studentWork: z.string().optional(),
});

export const RecognizeResultSchema = z.object({
  quality: z.enum(["good", "blurry", "no_problem"]),
  note: z.string().optional(),
  problems: z.array(RecognizedProblemSchema),
});

export type RecognizedProblem = z.infer<typeof RecognizedProblemSchema>;
export type RecognizeResult = z.infer<typeof RecognizeResultSchema>;
export type FigureSpec = z.infer<typeof FigureSpecSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Curriculum = z.infer<typeof CurriculumSchema>;
