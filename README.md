# 오답 쌍둥이 문제 학습지 (math-practice)

학생이 틀린 중학교 수학 문제 사진을 올리면 중1-1~중3-2 교육과정 중 해당 단원을 찾고,
**쌍둥이 문제 2개 · 관련 개념 설명 · 개념 확인 문제 · 교육과정 맵**을 4페이지 학습지(+정답지)로 만들어
Word·PDF로 내보내고 인쇄하는 웹앱입니다. 푼 학습지 사진을 올리면 채점하고 풀이를 설명합니다.

## 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 프로젝트 뼈대, 교육과정 데이터, 스키마, 4페이지+정답지 화면, 인쇄 CSS | ✅ |
| 2 | 사진 업로드 → 문제 인식 → 확인·수정 → 단원 분석·학습지 생성 (Claude API) | ✅ |
| 2+ | 채점·풀이 설명 탭 — 푼 학습지 사진 → 문제별 채점·틀린 지점·풀이 설명 | ✅ |
| 3 | 정답 검증 루프, Word(pandoc) / PDF(Playwright) 다운로드 | ✅ |
| 4 | 계정·기기 간 이력, 2015/2022 전환, 여러 문제 묶음 출력 | ⏳ |

> 이 코드는 패키지 설치가 막힌 환경에서 작성되어 **Next.js 앱 전체는 아직 실행해 보지 못했습니다.**
> 외부 패키지가 필요 없는 부분(답 비교, 정답 검증 흐름, Word 변환용 Markdown 생성)은 실제로 실행해 확인했고,
> pandoc으로 샘플 학습지를 Word로 변환해 수식 48개가 Word 수식으로 들어가고 5쪽으로 나뉘는 것까지 확인했습니다.
> 처음 받으면 아래 명령으로 빌드·테스트를 먼저 확인해 주세요.

## 실행

```bash
npm install
npm install @anthropic-ai/sdk@latest   # SDK를 최신 버전으로
cp .env.example .env.local             # ANTHROPIC_API_KEY 입력 (또는 화면에서 입력)
npm run dev                            # http://localhost:3000
npm test
npm run typecheck
```

### Claude API 키 넣는 두 가지 방법

API 키가 없으면 사진 읽기·학습지 만들기·채점이 **하나도 진행되지 않습니다.**

1. **화면에서 입력 (혼자 쓸 때 간편)** — 상단 **⚙ 설정** 또는 첫 화면의 키 입력 창에 Anthropic 콘솔에서 만든 키를 붙여 넣습니다.
   키는 그 브라우저(localStorage)에만 저장되고, AI 요청 때만 서버를 거쳐 Anthropic으로 전달됩니다(서버에 저장하지 않음).
2. **서버 환경 변수 (여러 사람이 쓸 때 권장)** — Netlify: Site configuration → Environment variables → `ANTHROPIC_API_KEY` 추가 → 다시 배포.
   서버 키가 있으면 화면의 키 입력 창은 나오지 않습니다.

키 발급: <https://console.anthropic.com/settings/keys> (결제 수단 등록·크레딧 충전 필요)

### Word·PDF 다운로드를 위한 설치 (선택)

| 기능 | 필요한 것 | 없으면 |
|---|---|---|
| Word 다운로드 (Word에서 고칠 수 있는 수식) | [pandoc](https://pandoc.org/installing.html) 3.x — `brew install pandoc` / `winget install JohnMacFarlane.Pandoc` / `apt install pandoc` | 수식을 일반 글자(×, ², √)로 넣은 Word 파일 |
| PDF 다운로드 (화면과 똑같은 PDF) | `npm i playwright && npx playwright install chromium` (서버에 한글 글꼴 필요: Noto Sans KR 등) | 브라우저 인쇄 창이 열림 → "PDF로 저장" |

pandoc 위치를 지정하려면 `PANDOC_PATH`, PDF 생성 시 앱 주소가 다르면 `APP_BASE_URL`을 설정합니다.
Word 서식(글꼴 맑은 고딕, A4, 여백)은 `templates/reference.docx`에서 바꿀 수 있습니다.

## 사용 흐름

1. **📷 틀린 문제 올리기** — 휴대폰에서는 바로 카메라가 열립니다. 사진은 긴 변 2000px JPEG로 줄여서 보냅니다.
2. **문제 확인·수정** — AI가 읽은 문제를 수식으로 미리 보여 줍니다. 잘못 읽은 부분은 고치고, 사진에 문제가 여러 개면 틀린 문제를 고릅니다. 학생 풀이를 적으면 어디서 틀렸는지 분석에 반영됩니다.
3. **분석** — 단원을 찾고 쌍둥이 문제·개념 설명·확인 문제를 만듭니다. 단원 신뢰도가 60% 미만이면 후보 단원 중에서 고르게 합니다.
4. **정답 검증** — 학습지를 먼저 보여 준 뒤, 그 화면에서 만든 문제를 정답 없이 따로 다시 풀게 해 정답지와 비교합니다(아래 참고).
5. **📄 학습지** — 미리보기 후 **Word 다운로드 / PDF 다운로드 / 인쇄**. 정답지 포함 여부를 고를 수 있습니다.
   각 페이지 위쪽에 **학습지 코드**(예: `K7P2`)가 인쇄됩니다.
6. **✅ 채점·풀이 설명** — 인쇄한 학습지를 푼 뒤 풀이 사진(최대 4장)을 올리면
   - 문제마다 ⭕ 맞음 / △ 부분 정답 / ❌ 틀림 / 안 풂 판정과 점수
   - 학생 손글씨 풀이를 읽어 **처음 틀린 줄과 이유**
   - 학생 풀이 흐름에 맞춘 **단계별 풀이 설명**, 기억할 개념 한 줄
   - 원래 오답과 같은 실수를 반복했는지 확인
   - 틀린 문제는 버튼 하나로 **그 문제의 새 쌍둥이 학습지** 생성
   - 채점 결과 인쇄

학습지와 채점 결과는 이 브라우저(localStorage)에 최근 30개까지 저장됩니다.
학습지를 만든 기기·브라우저에서 채점해야 코드로 찾을 수 있습니다. 사진은 서버에 저장하지 않습니다.

## 정답 검증은 이렇게 합니다

학습지의 모든 문제(원래 문제, 개념 예제, 쌍둥이 2개, 확인 문제)에 대해:

1. AI에게 **정답을 보여 주지 않고** 문제만 주어 다시 풀게 합니다(4문제씩 동시에).
2. 다시 푼 답과 정답지를 앱이 직접 비교합니다. `x=14`와 `14개`, `\frac{1}{2}`와 `0.5`, `2x+6`과 `6+2x`(문자에 값을 넣어 비교), `③`과 `③ x=2`처럼 표현만 다른 답은 같은 답으로 봅니다.
3. 다르면 두 풀이를 함께 보여 주고 처음부터 다시 계산해 판정하게 합니다.
   - 정답지가 맞음 → 통과
   - 정답지가 틀림 → 정답·풀이를 고치고 정답지에 이유를 표시
   - 확신할 수 없음 → **⚠ 검토 필요** 배지 (화면과 정답지에 표시)

검증 결과는 학습지 화면 위에 요약됩니다. 검증에 실패했거나 예전 학습지라면 **정답 검증하기** 버튼으로 다시 할 수 있습니다.

## 구조

```
app/
  page.tsx                      # 업로드 → 확인 → 분석 → 검증 (UploadFlow)
  worksheet/                    # 학습지 미리보기·다운로드·인쇄 (?id=코드, ?sample=1, ?answers=1)
  grade/page.tsx                # 채점·풀이 설명 탭
  api/recognize/route.ts        # 사진 → 문제 텍스트(LaTeX)·보기·도형·학생 풀이
  api/analyze/route.ts          # 학습지 1단계: 원래 문제 풀이 + 단원 매핑 + 틀린 지점
  api/analyze/part/route.ts     # 학습지 2단계: 문제 1개(또는 개념 설명)씩
  api/verify/solve, adjudicate  # 정답 검증: 문제 하나씩 다시 풀기 / 다르면 판정
  api/grade/route.ts            # 채점: 몇 문제씩 (사진 + 정답 → 판정·첨삭)
  api/grade/summary/route.ts    # 채점 총평
  api/check/route.ts            # API 키 연결 테스트
  api/export/docx/route.ts      # Word (pandoc, 없으면 docx 라이브러리)
  api/export/pdf/route.ts       # PDF (Playwright, 없으면 501 → 브라우저 인쇄)
components/
  nav/AppTabs.tsx               # 상단 탭
  upload/  grade/  worksheet/   # 화면
  math/MathText.tsx             # "$...$" LaTeX 혼합 텍스트 → KaTeX
  figure/FigureRenderer.tsx     # FigureSpec(점·선분·원) → SVG
lib/
  ai/                           # Claude 호출(서버 전용), 프롬프트, tool 스키마, 응답 정리, 재시도
  verify/expr.ts                # 작은 LaTeX 계산기 (\frac, \sqrt, 암묵적 곱, 문자)
  verify/answer.ts              # 두 답이 같은지 판단
  verify/run.ts                 # 검증 루프 (AI 호출을 주입받아 테스트 가능)
  export/blocks.ts              # 학습지 → 출력용 블록
  export/markdown.ts            # 블록 → pandoc Markdown (쪽 나눔·풀이 공간 포함)
  export/latex-plain.ts         # pandoc 없을 때 수식 → 일반 글자
  export/pandoc.ts, docx-basic.ts, context.ts
  client/                       # 이미지 축소, API 호출, 다운로드, localStorage 저장
  grade.ts                      # 채점 대상 목록·점수 계산
  schemas.ts                    # zod 스키마
  curriculum/index.ts           # 단원 조회, 선수/후속 단원 탐색
data/curriculum-2022.json       # 중1-1~중3-2 전체 단원
templates/reference.docx        # Word 서식 (맑은 고딕, A4, 여백 15/16mm)
tests/                          # vitest + 샘플 픽스처
```

## 설정

| 변수 | 설명 |
|---|---|
| `ANTHROPIC_API_KEY` | 필수. 서버에서만 사용 |
| `CLAUDE_MODEL` | 기본 `claude-sonnet-5-5`. 더 정확한 분석이 필요하면 `claude-opus-5-5` |
| `PANDOC_PATH` | 선택. pandoc 실행 파일 위치 |
| `APP_BASE_URL` | 선택. 서버 PDF 생성 시 열 앱 주소 (프록시 뒤에 있을 때) |

### 왜 요청을 잘게 나누나요? (Netlify 등 실행 시간 제한)

서버리스 호스팅은 요청 하나가 오래 걸리면 끊습니다(504). 그래서 AI 작업을 **요청 하나가 20초 안팎에 끝나도록** 나눠
브라우저가 차례로·동시에 보내고 결과를 합칩니다.

| 작업 | 요청 |
|---|---|
| 사진 읽기 | 1 |
| 학습지 만들기 | 단원 분석 1 → 쌍둥이 1·쌍둥이 2·개념·확인 1~4 **7개를 각각 따로 동시에** (확인 문제는 3개 이상 성공하면 완성) |
| 정답 검증 | 문제마다 1 (3개씩 동시), 답이 다르면 판정 1 추가 |
| 채점 | 쌍둥이 / 확인 1·2 / 확인 3·4(·5) 묶음별 1 (동시) + 총평 1 |

형식 오류(502)나 일시적 시간 초과(504)는 브라우저가 한 번 더 보냅니다.
채점 점수는 AI가 아니라 문제별 판정으로 앱이 직접 계산합니다.

## 교육과정 데이터 주의

`data/curriculum-2022.json`은 2022 개정 교육과정 표준 구성 기준입니다.
출판사마다 단원명·순서가 다르므로 **학교에서 쓰는 교과서 목차와 대조해 수정**해 주세요.
(2026년 기준 중3은 아직 2015 개정 적용, 2027년부터 전 학년 2022 개정)

## 알려진 한계

- 정답 검증도 AI가 하므로 100%는 아닙니다. "검토 필요" 표시가 없어도 배포 전 정답지를 한 번 훑어봐 주세요.
- Word 파일에는 도형이 들어가지 않습니다(화면·PDF·인쇄에는 들어감).
- 도형은 점·선분·원만 그립니다.
- 손글씨가 흐리면 채점이 틀릴 수 있습니다. "내 풀이(사진에서 읽은 내용)"를 펼쳐 제대로 읽었는지 확인해 주세요.
- 학습지는 기기 간에 공유되지 않습니다(Phase 4).
- 서버 PDF는 Netlify·Vercel 같은 서버리스 환경에서는 Chromium 실행이 어려울 수 있습니다. 그때는 자동으로 브라우저 인쇄로 대신합니다.
- **Netlify**: 서버 함수 실행 시간 제한이 있어 AI 작업을 잘게 나눠 보냅니다(위 표). 그래도 504가 반복되면
  사진을 문제 하나만 보이게 잘라 올리거나, 모델을 더 빠른 것으로 바꿔 보세요(`CLAUDE_MODEL`).
- 사진 인식이 실패하면 "문제를 직접 입력하기"로 글만 입력하고 사진은 그림 참고용으로 넘길 수 있습니다.
