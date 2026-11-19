# 오답 쌍둥이 문제 학습지 (math-practice)

학생이 틀린 중학교 수학 문제 사진을 올리면 중1-1~중3-2 교육과정 중 해당 단원을 찾고,
**쌍둥이 문제 2개 · 관련 개념 설명 · 개념 확인 문제 · 교육과정 맵**을 4페이지 학습지(+정답지)로 만들어
Word·PDF로 내보내고 인쇄하는 웹앱입니다.

## 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 뼈대, 교육과정 데이터, 스키마, 4페이지+정답지 화면(샘플 데이터), 인쇄 CSS | ✅ 코드 작성 (실행 검증 필요) |
| 2 | 사진 업로드 → 인식 확인·수정 → `/api/analyze` (Claude API) | ⏳ |
| 3 | 정답 검증 루프, PDF(Playwright) / Word(pandoc) 출력 | ⏳ |
| 4 | 오답 이력, 개별 재생성, 2015/2022 전환, 여러 문제 묶음 출력 | ⏳ |

> Phase 1 코드는 패키지 설치가 막힌 환경에서 작성되어 **아직 한 번도 실행되지 않았습니다.**
> 처음 받으면 아래 명령으로 빌드·테스트를 먼저 확인해 주세요.

## 실행

```bash
npm install
npm run dev        # http://localhost:3000 → "샘플 학습지 미리보기"
npm test           # 교육과정 데이터·수식 파서 테스트
npm run typecheck
```

학습지 화면에서 **인쇄 / PDF로 저장** 버튼을 누르면 브라우저 인쇄 창이 열립니다.
(인쇄 설정에서 "배경 그래픽" 켜기, 여백 "없음" 권장)

## 구조

```
app/
  page.tsx                    # 시작 화면 (업로드는 Phase 2)
  worksheet/page.tsx          # 학습지 미리보기 (현재는 샘플 데이터)
  worksheet/WorksheetView.tsx # 정답지 포함 토글, 인쇄 버튼
components/
  worksheet/                  # TwinPage, ConceptPage, CheckPage, CurriculumMapPage, AnswerPage
  math/MathText.tsx           # "$...$" LaTeX 혼합 텍스트 → KaTeX
  figure/FigureRenderer.tsx   # FigureSpec(점·선분·원) → SVG
lib/
  schemas.ts                  # zod 스키마 (AnalysisResult, Problem, Unit…)
  curriculum/index.ts         # 단원 조회, 선수/후속 단원 탐색
data/curriculum-2022.json     # 중1-1~중3-2 전체 단원
tests/                        # vitest + 샘플 픽스처
```

## 교육과정 데이터 주의

`data/curriculum-2022.json`은 2022 개정 교육과정 표준 구성 기준입니다.
출판사마다 단원명·순서가 다르므로 **학교에서 쓰는 교과서 목차와 대조해 수정**해 주세요.
(2026년 기준 중3은 아직 2015 개정 적용, 2027년부터 전 학년 2022 개정)

## 다음 단계 (Phase 2)

`.env.example`을 `.env.local`로 복사하고 `ANTHROPIC_API_KEY`를 넣은 뒤,
코딩 AI에게 프로젝트 문서의 최종 프롬프트와 함께 "Phase 2 진행해줘"라고 요청하세요.
