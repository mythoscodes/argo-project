# Argos — 개인 PC 셋업 가이드

> 이 문서는 회사 PC에서 기획한 내용을 개인 PC로 이관하여 개발을 시작하기 위한 가이드입니다.

## 1. 사전 준비 (개인 PC)

### 필수 설치
```bash
# Node.js 20+ (LTS)
brew install node   # 또는 nvm install 20

# pnpm (패키지 매니저)
npm install -g pnpm

# Supabase CLI
brew install supabase/tap/supabase

# Vercel CLI
npm install -g vercel

# Claude Code
npm install -g @anthropic-ai/claude-code
```

### 계정 준비
- [ ] Google AI Studio 계정 → Gemini API Key 발급 (https://aistudio.google.com/apikey)
- [ ] Supabase 계정 → 새 프로젝트 생성 (https://supabase.com)
- [ ] Vercel 계정 → GitHub 연동 (https://vercel.com)
- [ ] GitHub 계정 → `argos` public 레포 생성
- [ ] (옵션 B/C) Anthropic 개인 계정 → Claude API Key 발급 (https://console.anthropic.com)

## 2. 프로젝트 초기화

### 2-1. 아카이브 해제 후 Git 초기화
```bash
cd ~/IdeaProjects/argos
git init
git add .
git commit -m "chore: 프로젝트 초기 설정 — 기획서, 하네스, 에이전트 정의"
```

### 2-2. Next.js 프로젝트 생성
```bash
pnpm create next-app . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```
> 이미 존재하는 파일(CLAUDE.md, docs/ 등)은 유지됩니다.

### 2-3. 의존성 설치
```bash
# 핵심
pnpm add @supabase/supabase-js @supabase/ssr
pnpm add ai @ai-sdk/google @ai-sdk/anthropic
pnpm add recharts
pnpm add zod

# shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button card input label tabs badge alert dialog

# 개발
pnpm add -D supabase
```

### 2-4. 환경변수 설정
```bash
cp .env.example .env.local
# .env.local을 편집하여 실제 키 입력
```

### 2-5. Supabase 연결
```bash
supabase init  # 이미 supabase/ 폴더가 있으면 스킵
supabase link --project-ref <your-project-ref>
supabase db push  # 마이그레이션 적용
supabase gen types typescript --local > src/types/database.ts
```

### 2-6. Vercel 배포 연결
```bash
vercel link
vercel env pull .env.local  # 또는 Vercel 대시보드에서 환경변수 설정
```

### 2-7. GitHub 연결
```bash
git remote add origin https://github.com/<username>/argos.git
git push -u origin main
```

## 3. Claude Code 하네스 설정

### 3-1. 플러그인 설치

개인 PC에서 Claude Code 실행 후 다음 플러그인을 설치합니다:

```bash
# Claude Code 내에서 실행
/install-plugin context7          # 라이브러리 문서 자동 조회 (Next.js, Supabase, Vercel AI SDK 등)
/install-plugin supabase          # Supabase DB 관리, 인증, 마이그레이션
/install-plugin code-review       # 코드 리뷰 자동화
/install-plugin discord           # Discord 원격 제어
/install-plugin skill-creator     # 커스텀 스킬 생성
```

설치 후 `.claude/settings.json`의 `enabledPlugins`에 자동 반영됩니다.
이미 `settings.json`에 활성화 설정이 포함되어 있으므로, 플러그인 설치만 하면 됩니다.

**플러그인 역할:**

| 플러그인 | 용도 | 필수 여부 |
|----------|------|-----------|
| **context7** | Next.js 14, Supabase, Vercel AI SDK, Zod, Recharts 등 최신 문서 조회. API 문법이 헷갈릴 때 자동으로 공식 문서 참조 | **필수** |
| **supabase** | Supabase 프로젝트 연결, 마이그레이션, 타입 생성 자동화 | **필수** |
| **code-review** | PR 전 코드 리뷰 — CLAUDE.md 규칙 준수 여부 자동 점검 | 권장 |
| **discord** | Discord 채널에서 Claude Code 명령 원격 실행 | 권장 |
| **skill-creator** | 커스텀 스킬 추가 생성 시 사용 | 선택 |

### 3-2. MCP 서버 확인

프로젝트 `.claude/settings.json`에 MCP 도구 허용이 설정되어 있습니다. 글로벌 MCP 설정과 프로젝트 설정이 자동 병합됩니다.

**프로젝트에서 사용하는 MCP 도구:**

| MCP | 도구 | 용도 |
|-----|------|------|
| **context7** | `resolve-library-id`, `query-docs` | "Supabase Realtime 사용법" 같은 질문 시 최신 공식 문서에서 답변 |
| **supabase** | `authenticate` | Supabase 프로젝트 연결/관리 |
| **playwright** | `browser_navigate`, `browser_snapshot`, `browser_click` 등 | 데모 UI 자동 테스트, 스크린샷 캡처 |

**확인 방법:**
```bash
# Claude Code 내에서
> context7 MCP가 동작하는지 테스트
> "Next.js 14 App Router의 API Route 작성법을 context7으로 조회해줘"
```

### 3-3. 커스텀 커맨드 (슬래시 명령) 확인

`.claude/commands/` 디렉토리에 프로젝트 전용 슬래시 명령이 정의되어 있습니다.
Claude Code 실행 시 자동으로 인식됩니다.

**사용 가능한 커맨드:**

| 명령 | 용도 | 사용 예시 |
|------|------|-----------|
| `/db-migrate` | Supabase 마이그레이션 생성+적용+타입 재생성 | `/db-migrate 세션 참여자 테이블 추가` |
| `/ai-test` | AI 퀴즈 생성 품질 테스트 (과정별) | `/ai-test python` 또는 `/ai-test spring` |
| `/demo-check` | 데모 6단계 전체 동작 점검 | `/demo-check` |
| `/security-audit` | API Key 노출, RLS, 입력 검증 보안 감사 | `/security-audit` |
| `/deploy-check` | 배포 전 빌드+보안+데모 종합 점검 | `/deploy-check` |
| `/sprint-status` | 스프린트 진행 현황 종합 리포트 | `/sprint-status` |
| `/api-scaffold` | API Route 스캐폴딩 (패턴 자동 적용) | `/api-scaffold ai/quiz` |

### 3-4. 에이전트 정의 확인

`.claude/agents/` 디렉토리에 커스텀 에이전트가 정의되어 있습니다.

| 에이전트 | 파일 | 역할 |
|----------|------|------|
| **backend-dev** | `.claude/agents/backend-dev.md` | API Routes + Supabase 백엔드 |
| **ai-engineer** | `.claude/agents/ai-engineer.md` | Vercel AI SDK + 프롬프트 엔지니어링 |
| **db-architect** | `.claude/agents/db-architect.md` | DB 스키마 + 마이그레이션 + RLS |

### 3-5. Discord 원격 제어 설정

```bash
# Claude Code 내에서
/discord:access   # Discord 채널 페어링 설정
```

설정 후 Discord 채널에서:
- 태스크 지시 → Claude Code가 실행
- 결과 확인 → Discord에 자동 응답
- `/sprint-status` 같은 커맨드도 Discord에서 실행 가능

### 3-6. 하네스 동작 확인 체크리스트

Claude Code 실행 후 다음을 순서대로 확인:

```
- [ ] CLAUDE.md가 자동 로드되었는지 (첫 응답에 프로젝트 인식 여부 확인)
- [ ] /sprint-status 명령이 인식되는지
- [ ] /ai-test python 명령이 인식되는지
- [ ] context7으로 "Next.js App Router" 문서 조회 가능한지
- [ ] Supabase 플러그인이 활성화되었는지
- [ ] Discord 플러그인 연결 (선택)
```

## 4. 개발 시작

### Claude Code로 개발
```bash
cd ~/IdeaProjects/argos
claude  # Claude Code 시작 — CLAUDE.md + settings.json + agents/ + commands/ 자동 로드
```

### 에이전트 팀 활용
```
# Claude Code 내에서 에이전트 스폰
> backend-dev 에이전트로 세션 관리 API 구현해줘
> ai-engineer 에이전트로 퀴즈 생성 프롬프트 작성해줘
> db-architect 에이전트로 초기 마이그레이션 작성해줘
```

### 커스텀 커맨드 활용
```
# 개발 중 수시로 활용
> /sprint-status              # 진행 현황 확인
> /ai-test python             # AI 퀴즈 품질 테스트
> /security-audit             # 보안 점검
> /demo-check                 # 데모 동작 확인
> /deploy-check               # 배포 전 최종 점검
```

## 4. 개발 순서 (9일 로드맵)

| Phase | 기간 | 내용 |
|-------|------|------|
| 1 | Day 1 | Next.js + Supabase + Auth 셋업, DB 스키마 생성 |
| 2 | Day 2-3 | 세션 관리 + AI 퀴즈 생성 + 수강생 응답 UI |
| 3 | Day 4-5 | Supabase Realtime + 이해도 히트맵 + AI 코칭 |
| 4 | Day 6-7 | 강사 대시보드 완성 + 피드백 루프 |
| 5 | Day 8 | 수강생 리포트 + 원장 탭(시간 여유 시) |
| 6 | Day 9 | UI 폴리싱 + 데모 데이터 + 배포 + 테스트 |

## 5. 체크리스트

### 개발 시작 전
- [ ] Node.js 20+ 설치
- [ ] pnpm 설치
- [ ] Supabase CLI 설치
- [ ] Claude Code 설치 (`npm install -g @anthropic-ai/claude-code`)
- [ ] Google AI Studio API Key 발급
- [ ] Supabase 프로젝트 생성
- [ ] GitHub public 레포 생성
- [ ] .env.local 설정 완료

### Claude Code 하네스 확인
- [ ] 플러그인 설치 (context7, supabase, code-review, discord)
- [ ] `claude` 실행 → CLAUDE.md 자동 로드 확인
- [ ] `/sprint-status` 커맨드 인식 확인
- [ ] context7 MCP 문서 조회 테스트
- [ ] Discord 원격 제어 설정 (선택)

### Day 2 (AI 품질 테스트)
- [ ] Gemini 3 Flash로 KIT 과정별 퀴즈 10개 생성
- [ ] 품질 ★★★★ 이상 → 옵션 A 유지
- [ ] 품질 ★★★ 이하 → 옵션 B로 전환

### 배포 전
- [ ] .env.local이 .gitignore에 포함되어 있는지 확인
- [ ] API Key가 클라이언트 코드에 노출되지 않는지 확인
- [ ] Supabase RLS 정책 활성화 확인
- [ ] Vercel 환경변수 설정 확인
- [ ] 라이브 URL 동작 확인
