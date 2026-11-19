# 오답 쌍둥이 문제 학습지 (math-practice)

학생이 틀린 중학교 수학 문제 사진을 올리면 중1-1~중3-2 교육과정 중 해당 단원을 찾고,
**쌍둥이 문제 2개 · 관련 개념 설명 · 개념 확인 문제 · 교육과정 맵**을 4페이지 학습지(+정답지)로 만들어
Word·PDF로 내보내고 인쇄하는 웹앱입니다.

## 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 뼈대, 교육과정 데이터, 스키마, 4페이지+정답지 화면, 인쇄 CSS | ✅ 코드 작성 (실행 검증 필요) |
| 2 | 사진 업로드 → 문제 인식 → 확인·수정 → 단원 분석·학습지 생성 (Claude API) | ✅ 코드 작성 (실행 검증 필요) |
| 3 | 정답 검증 루프, PDF(Playwright) / Word(pandoc) 출력 | ⏳ |
| 4 | 오답 이력, 개별 재생성, 2015/2022 전환, 여러 문제 묶음 출력 | ⏳ |

> 이 코드는 패키지 설치가 막힌 환경에서 작성되어 **아직 한 번도 실행되지 않았습니다.**
> 처음 받으면 아래 명령으로 빌드·테스트를 먼저 확인해 주세요.

## 실행

```bash
npm install
npm install @anthropic-ai/sdk@latest   # SDK를 최신 버전으로
cp .env.example .env.local             # ANTHROPIC_API_KEY 입력
npm run dev                            # http://localhost:3000
npm test
npm run typecheck
```

## 사용 흐름

1. **사진 올리기** — 휴대폰에서는 바로 카메라가 열립니다. 사진은 긴 변 2000px JPEG로 줄여서 보냅니다.
2. **문제 확인·수정** — AI가 읽은 문제를 수식으로 미리 보여 줍니다. 잘못 읽은 부분은 고치고, 사진에 문제가 여러 개면 틀린 문제를 고릅니다. 학생 풀이를 적으면 어디서 틀렸는지 분석에 반영됩니다.
3. **분석** — 단원을 찾고 쌍둥이 문제·개념 설명·확인 문제를 만듭니다. 단원 신뢰도가 60% 미만이면 후보 단원 중에서 고르게 합니다.
4. **학습지** — 미리보기 후 **인쇄 / PDF로 저장**. (인쇄 설정: "배경 그래픽" 켜기, 여백 "없음")

결과는 브라우저 탭 세션에만 저장됩니다. 사진은 서버에 저장하지 않습니다.

## 구조

```
app/
  page.tsx                      # 업로드 → 확인 → 분석 (UploadFlow)
  worksheet/                    # 학습지 미리보기·인쇄 (세션 결과 또는 ?sample=1)
  api/recognize/route.ts        # 사진 → 문제 텍스트(LaTeX)·보기·도형·학생 풀이
  api/analyze/route.ts          # 문제 → 단원 매핑 + 학습지 내용
components/
  upload/UploadFlow.tsx
  worksheet/                    # TwinPage, ConceptPage, CheckPage, CurriculumMapPage, AnswerPage
  math/MathText.tsx             # "$...$" LaTeX 혼합 텍스트 → KaTeX
  figure/FigureRenderer.tsx     # FigureSpec(점·선분·원) → SVG
lib/
  ai/client.ts                  # Claude 호출 (서버 전용, tool use로 JSON 강제)
  ai/prompts.ts                 # 시스템 프롬프트 (쌍둥이 문제 규칙 등)
  ai/tools.ts                   # tool 입력 JSON 스키마 (단원 id는 enum으로 제한)
  ai/analyze.ts                 # AI 응답 검증·정리
  ai/retry.ts, errors.ts, http.ts
  client/                       # 이미지 축소, API 호출, 세션 저장
  schemas.ts                    # zod 스키마
  curriculum/index.ts           # 단원 조회, 선수/후속 단원 탐색
data/curriculum-2022.json       # 중1-1~중3-2 전체 단원
tests/                          # vitest + 샘플 픽스처
```

## 설정

| 변수 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | 필수. 서버에서만 사용 |
| `CLAUDE_MODEL` | 기본 `claude-sonnet-5-5`. 더 정확한 분석이 필요하면 `claude-opus-5-5` |

분석 한 번은 Claude 호출 2회(인식 1 + 분석 1)이며, 형식 오류가 나면 각각 1회 재시도합니다.

## 교육과정 데이터 주의

`data/curriculum-2022.json`은 2022 개정 교육과정 표준 구성 기준입니다.
출판사마다 단원명·순서가 다르므로 **학교에서 쓰는 교과서 목차와 대조해 수정**해 주세요.
(2026년 기준 중3은 아직 2015 개정 적용, 2027년부터 전 학년 2022 개정)

## 알려진 한계 (Phase 3에서 보완)

- AI가 만든 정답을 아직 따로 검증하지 않습니다. 학습지 배포 전 정답지를 한 번 확인해 주세요.
- Word·PDF 다운로드 버튼은 아직 비활성 상태입니다(브라우저 인쇄로 PDF 저장 가능).
- 도형은 점·선분·원만 그립니다.
