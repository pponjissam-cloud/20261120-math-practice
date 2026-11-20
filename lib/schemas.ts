import { z } from "zod";

/**
 * AI가 글 대신 숫자(예: 답 3)나 줄 목록(풀이 단계 배열)으로 보내도 글로 받아 준다.
 * (예: "몇 개인가?" 문제의 answer를 3 으로 보내면 문제 전체가 형식 오류가 되던 문제)
 */
const Text = z.preprocess(
  (v) => (typeof v === "number" ? String(v) : Array.isArray(v) && v.every((x) => typeof x === "string") ? v.join("\n") : v),
  z.string(),
);

/** "AB" 처럼 문자열로 온 선분도 ["A","B"]로 받아 준다. */
const SegmentSchema = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const names = v.match(/[A-Z][0-9']*/g);
  return names && names.length === 2 ? names : v;
}, z.tuple([z.string(), z.string()]));

/** 도형 명세. AI가 SVG를 직접 그리지 않고 이 데이터를 주면 FigureRenderer가 그린다. */
export const FigureSpecSchema = z.object({
  type: z.enum(["triangle", "polygon", "circle", "coordinate", "solid"]),
  points: z.array(z.object({ label: z.string(), x: z.coerce.number(), y: z.coerce.number() })).optional(),
  segments: z.array(SegmentSchema).optional(),
  /** 점선(입체도형의 보이지 않는 모서리 등) */
  dashed: z.array(SegmentSchema).optional(),
  labels: z.array(z.object({ text: z.string(), at: z.string() })).optional(),
  circle: z.object({ cx: z.coerce.number(), cy: z.coerce.number(), r: z.coerce.number() }).optional(),
});

/**
 * 도형은 있으면 좋은 정보일 뿐이므로, 형식이 조금 틀려도 문제 전체를 실패시키지 않고 도형만 버린다.
 * (입체도형처럼 복잡한 그림에서 AI가 형식을 어기면 문제 인식 전체가 실패하던 문제)
 */
const OptionalFigure = FigureSpecSchema.optional().catch(undefined);

/** "2", 2.0 처럼 와도 1~3 난이도로 받아 준다. */
const Difficulty = z.preprocess(
  (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(3, Math.max(1, Math.round(n))) : 2;
  },
  z.union([z.literal(1), z.literal(2), z.literal(3)]),
);

export const ProblemSchema = z.object({
  text: Text.pipe(z.string().min(1)),
  choices: z.array(Text).optional(),
  answer: Text.pipe(z.string().min(1)),
  solution: Text.pipe(z.string().min(1)),
  difficulty: Difficulty,
  figure: OptionalFigure,
  /** 정답 검증 결과. true면 "검토 필요" 배지를 표시한다. */
  needsReview: z.boolean().optional(),
  /** 정답 검증에서 고쳐졌거나 확인이 필요한 이유 */
  verifyNote: z.string().optional(),
});

export const VerificationSchema = z.object({
  checked: z.number(),
  corrected: z.number(),
  review: z.number(),
  /** 검증 자체를 하지 못했을 때(네트워크·설정 오류) */
  failed: z.boolean().optional(),
  at: z.string(),
});

export const AnalysisResultSchema = z.object({
  original: z.object({
    text: Text,
    choices: z.array(Text).optional(),
    answer: Text,
    solution: Text,
    figure: OptionalFigure,
    needsReview: z.boolean().optional(),
    verifyNote: z.string().optional(),
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
  verification: VerificationSchema.optional(),
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
  number: z.union([z.string(), z.number()]).transform(String).optional(),
  text: z.string().min(1),
  choices: z.array(Text).optional(),
  figure: OptionalFigure,
  /** 학생이 쓴 풀이·답·채점 표시. 문제 본문과 분리한다. */
  studentWork: z.string().optional(),
});

export const RecognizeResultSchema = z.object({
  quality: z.enum(["good", "blurry", "no_problem"]),
  note: z.string().optional(),
  problems: z.array(RecognizedProblemSchema),
});

/** 학습지 풀이 사진 채점 결과 — 문제 하나. problemId는 "T1"(쌍둥이 1번), "C2"(확인 2번) 형식. */
export const GradeItemSchema = z.object({
  problemId: z.string(),
  status: z.enum(["correct", "partial", "wrong", "blank", "not_found"]),
  studentAnswer: z.string().optional(),
  /** 학생 손글씨 풀이를 옮겨 적은 것 */
  studentWork: z.string().optional(),
  /** 처음 틀린 지점과 이유 */
  errorStep: z.string().optional(),
  feedback: z.string(),
  /** 단계별 바른 풀이 설명 */
  explanation: z.string(),
  tip: z.string().optional(),
});

export const GradeResultSchema = z.object({
  items: z.array(GradeItemSchema),
  summary: z.string(),
  nextStep: z.string(),
  photoNote: z.string().optional(),
});

export type GradeItem = z.infer<typeof GradeItemSchema>;
export type GradeResult = z.infer<typeof GradeResultSchema>;
export type RecognizedProblem = z.infer<typeof RecognizedProblemSchema>;
export type RecognizeResult = z.infer<typeof RecognizeResultSchema>;
export type FigureSpec = z.infer<typeof FigureSpecSchema>;
export type Problem = z.infer<typeof ProblemSchema>;
export type Verification = z.infer<typeof VerificationSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type Curriculum = z.infer<typeof CurriculumSchema>;
