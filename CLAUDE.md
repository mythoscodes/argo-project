# Argos — AI 실시간 수업 분석 플랫폼

> "100개의 눈으로 교실을 본다" — 팀 mythos

## 프로젝트 개요
- **팀**: mythos
- **프로젝트**: Argos (그리스 신화 100개의 눈을 가진 거인)
- **타겟**: 코리아IT아카데미 (성인 IT 직업훈련, 국비지원 과정)
- **아키텍처**: Serverless 풀스택 (Next.js App Router + Supabase + Gemini 3 Flash + Vercel)
- **공모전**: 2026 KIT 바이브코딩 공모전 — AI활용 차세대 교육 솔루션

## 기술 스택

### 백엔드/AI/DB (변경 금지 — 엄격)
- **프레임워크**: Next.js 14+ (App Router, Server Components 우선)
- **DB/Auth/Realtime**: Supabase (PostgreSQL + RLS + Realtime + Auth)
- **AI**: Vercel AI SDK (`ai`) + Gemini 3 Flash (기본) / Claude Sonnet 4.6 (옵션)
- **검증**: Zod (모든 외부 입력 + AI 응답 검증)
- **배포**: Vercel
- **언어**: TypeScript (strict mode, JavaScript 파일 생성 금지)

### 프론트엔드/디자인 (유연 — 프론트엔드 팀원 재량)
- **기본 스타일링**: Tailwind CSS + shadcn/ui (권장하나, 프론트엔드 팀원이 다른 UI 라이브러리 추가 가능)
- **차트**: Recharts (권장하나, 프론트엔드 팀원이 Nivo, Chart.js 등 대안 사용 가능)
- **디자인 관련 의존성**: 프론트엔드 팀원이 자유롭게 추가/변경 가능 (애니메이션, 아이콘, 폰트 등)
- **컴포넌트 구조**: `src/components/` 하위 구조는 프론트엔드 팀원이 자유롭게 결정

## 절대 규칙 (위반 시 즉시 수정)

### 보안
1. API Key(`GOOGLE_GENERATIVE_AI_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)는 **서버사이드 전용**
2. `NEXT_PUBLIC_` 접두사는 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_URL`에만 허용 — 다른 키에 절대 사용 금지
3. `.env.local`은 `.gitignore`에 반드시 포함 — 커밋 전 `git diff --cached`로 확인
4. Supabase RLS **필수 활성화** — 새 테이블 생성 시 RLS 정책을 같은 마이그레이션에 포함
5. SQL 쿼리에 사용자 입력 직접 삽입 금지 — 반드시 Supabase 파라미터 바인딩 사용
6. 클라이언트 코드에서 `SUPABASE_SERVICE_ROLE_KEY` 참조 시 빌드 에러로 간주

### 아키텍처
7. **프론트엔드는 다른 팀원이 담당** — `src/components/`, `src/app/(페이지)/page.tsx`의 UI는 건드리지 않음. 백엔드/AI/DB에 집중
8. 백엔드/AI/DB 의존성 추가 전 반드시 확인: 기존 스택으로 해결 가능한가? (프론트엔드/디자인 관련 의존성은 프론트엔드 팀원 재량)
9. `src/app/api/` 외부에 서버 로직 금지 — Server Actions 사용하지 않음, API Route로 통일
10. DB 직접 쿼리는 서버 컴포넌트 또는 API Route에서만 — 클라이언트에서 `supabase.from()` 직접 호출은 읽기 전용 + RLS 보호 하에만

### AI
11. AI 프롬프트는 반드시 `src/lib/ai/prompts/`에 분리 — API Route 파일에 인라인 프롬프트 금지
12. AI 응답은 반드시 Zod 스키마로 검증 — 검증 없이 직접 사용 금지
13. AI API 호출은 서버사이드(API Route)에서만 — 클라이언트에서 직접 AI API 호출 금지
14. JSON 파싱 실패 시 1회 재시도 로직 필수 포함
15. `temperature` 기본값: 퀴즈 생성 `0.3`, 코칭/리포트 `0.5` — 변경 시 주석으로 이유 기재

### 코드 품질
16. `any` 타입 사용 절대 금지 → `unknown` + 타입 가드 또는 구체적 타입
17. `console.log` 프로덕션 코드에 남기지 않음 — 디버깅 후 반드시 제거
18. 미사용 import, 미사용 변수 금지 — 빌드 경고 0개 유지
19. 함수/변수명은 의미를 명확히 전달 — `data`, `result`, `temp` 같은 이름 금지
20. 하드코딩된 매직 넘버 금지 → `src/lib/constants.ts`에 상수로 정의

## 코딩 컨벤션

### 파일/디렉토리
- 컴포넌트/페이지: `kebab-case.tsx` (예: `heatmap.tsx`, `quiz-card.tsx`)
- 유틸/라이브러리: `kebab-case.ts` (예: `model.ts`, `utils.ts`)
- 타입 파일: `kebab-case.ts` (예: `database.ts`, `ai.ts`)
- 디렉토리: `kebab-case` (예: `quiz-generation/`)
- 상수: `UPPER_SNAKE_CASE` (예: `MAX_QUIZ_COUNT = 5`)

### React / Next.js 패턴
- Server Components 기본 — `'use client'`는 이벤트 핸들러, 상태, 브라우저 API가 필요한 경우만
- 데이터 페칭: Server Components에서 Supabase 직접 쿼리 (RSC 패턴)
- 실시간 데이터: `src/hooks/use-realtime.ts` 커스텀 훅으로 Supabase Realtime 구독
- 폼 제출: API Route 호출 (`fetch('/api/...')`) — Server Actions 사용하지 않음
- 에러 표시: `error.tsx` 파일로 에러 바운더리 처리
- 로딩 상태: `loading.tsx` 파일 또는 `Suspense` 활용

### API Route 규칙
- 경로: `src/app/api/{리소스}/route.ts` (RESTful)
- AI 관련: `src/app/api/ai/{기능}/route.ts`
- 메서드: `GET`, `POST`, `PATCH`, `DELETE` export
- 입력 검증: Zod 스키마로 `req.json()` 결과 검증 후 사용
- 응답 형태: `NextResponse.json({ data })` 또는 `NextResponse.json({ error }, { status })`
- 인증 확인: 보호된 엔드포인트는 `supabase.auth.getUser()` 먼저 확인

### Supabase
- 클라이언트: `src/lib/supabase/client.ts` (브라우저용), `src/lib/supabase/server.ts` (서버용)
- RLS 정책: 모든 테이블에 `academy_id` 기반 격리
- 마이그레이션: `supabase/migrations/NNNNN_description.sql` 형식
- 타입 생성: `supabase gen types typescript --local > src/types/database.ts`
- Realtime: `supabase.channel()` → `on('postgres_changes')` 패턴

### AI 프롬프트 작성 규칙
- 프롬프트 파일: `src/lib/ai/prompts/{기능}.ts` — 함수로 export
- 시스템 프롬프트에 반드시 포함: KIT 교육 맥락 (성인 수강생, 국비지원, 비전공자~경력자 편차)
- few-shot 예시: KIT 실제 과정별(Spring/React/Python/보안/네트워크) 1개 이상
- 응답 스키마: `src/lib/ai/schemas/{기능}.ts` — Zod 스키마로 정의
- 토큰 효율: 시스템 프롬프트는 가능한 짧게, 핵심 지시만 포함

### 커밋 컨벤션
- 접두사: `feat:` / `fix:` / `refactor:` / `docs:` / `chore:` / `test:`
- 본문: 한국어 허용 (예: `feat: 이해도 히트맵 실시간 갱신 구현`)
- 커밋 단위: 하나의 논리적 변경 = 하나의 커밋 (거대 커밋 금지)
- 미완성 코드 커밋 금지 — 빌드가 되는 상태에서만 커밋

## AI 모델 전환 (환경변수)
- `AI_MODEL=gemini-3-flash` → 옵션 A (무료, 기본 권장)
- `AI_MODEL=claude-sonnet` → 옵션 C (품질 최우선)
- 하이브리드(옵션 B): `AI_MODEL_QUIZ=claude-sonnet`, 나머지 `AI_MODEL=gemini-3-flash`
- 전환은 `src/lib/ai/model.ts`에서 중앙 관리 — 다른 파일에서 모델 직접 import 금지

## MVP 우선순위
- **P0** (데모 필수): F1 세션관리, F2 AI퀴즈생성, F3 수강생응답, F4 히트맵, F5 AI코칭
- **P1** (데모 권장): F6 피드백루프, F7 수강생리포트
- **P2** (보너스): F8 원장대시보드 (MVP 제외)
- **공수 배분**: 강사 대시보드 80% / 수강생 UI 15% / 리포트 5%

## 구현 순서 (의존성 기반)
```
F1 세션관리 → F2 AI퀴즈생성 → F3 수강생응답 → F4 히트맵 → F5 AI코칭 → F6 피드백루프 → F7 리포트
```
- F2는 F1에 의존 (세션이 있어야 퀴즈 생성)
- F4는 F3에 의존 (응답이 있어야 히트맵 표시)
- F5는 F4에 의존 (이해도 데이터가 있어야 코칭)
- 이 순서를 무시하고 건너뛰지 않는다

## 디렉토리 구조 (생성 시 참고)
```
src/
├── app/
│   ├── api/ai/{quiz,analysis,coaching,report}/route.ts
│   ├── api/sessions/route.ts, [id]/route.ts
│   ├── api/quizzes/route.ts
│   ├── api/responses/route.ts
│   ├── instructor/   (강사 뷰 — 프론트엔드 팀원 담당)
│   └── student/       (수강생 뷰 — 프론트엔드 팀원 담당)
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── ai/{model,prompts/,schemas/}.ts
│   ├── constants.ts
│   └── utils.ts
├── hooks/use-realtime.ts, use-session.ts
└── types/{database,ai}.ts
supabase/
├── migrations/NNNNN_*.sql
└── seed.sql
```

## 참고 문서
- 기획서: `docs/PLANNING.md` — 기능 상세, 데모 시나리오, AI 전략
- 회의록: `docs/MEETING_LOG.md` — 의사결정 과정 기록
- 셋업 가이드: `docs/SETUP_GUIDE.md` — 개인 PC 환경 구축
- 세부 규칙: `rules/` — 개발 패턴, 보안, DB, AI, 에이전트 운영
