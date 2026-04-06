# Argos 프로젝트 — MCP 서버, 스킬, 플러그인 설정 가이드

> Claude Code 에이전트 팀을 위한 개발 도구 체계 (2026-04-06)

## 목차
1. [MCP 서버 선별 및 설정](#mcp-서버-선별-및-설정)
2. [프로젝트 레벨 MCP 설정 방법](#프로젝트-레벨-mcp-설정-방법)
3. [유용한 스킬 목록](#유용한-스킬-목록)
4. [커스텀 스킬 정의 방법](#커스텀-스킬-정의-방법)
5. [추천 설정 파일](#추천-설정-파일)

---

## MCP 서버 선별 및 설정

### 1. Context7 (라이브러리 문서 자동 조회)

**목적**: Next.js 14, Supabase, Vercel AI SDK, Zod, Gemini API 등 최신 문서 실시간 조회

**활용 시나리오**:
- Next.js 14 App Router의 최신 문법 (Server Components, Dynamic Routes)
- Supabase 마이그레이션, RLS 정책 작성
- Vercel AI SDK와 Gemini 3 Flash 연동
- Zod 검증 스키마 작성
- shadcn/ui 컴포넌트 API
- Recharts 차트 구성

**설정 위치**: 글로벌 MCP (`~/.claude/settings.json`) 또는 프로젝트 MCP (`.claude/settings.json`)

**사용 예시**:
```typescript
// Vercel AI SDK의 streamText 최신 API를 알고 싶을 때
// → Context7를 통해 docs/vercel-ai-sdk 자동 조회
// → generateObject 사용법, tool 정의 패턴 등 실시간 제공
```

**추천 레벨**: ⭐⭐⭐⭐⭐ (필수)

---

### 2. Supabase MCP (데이터베이스/인증 자동화)

**목적**: Supabase CLI 없이 마이그레이션, 스키마, RLS 정책 자동 생성 및 관리

**활용 시나리오**:
- DB 마이그레이션 파일 자동 생성 (`supabase/migrations/`)
- RLS 정책 검증 및 생성
- 타입 생성 자동화 (`src/types/database.ts`)
- Supabase Auth 설정
- 개발 환경과 프로덕션 환경 동기화

**설정 위치**: 프로젝트 MCP (`.claude/settings.json`)

**사용 예시**:
```bash
# MCP를 통해 직접 명령 실행 (CLI 필요 없음)
# → 새 테이블 생성 시 자동으로 RLS 정책 포함
# → 마이그레이션 파일 자동 생성
```

**추천 레벨**: ⭐⭐⭐⭐⭐ (필수)

---

### 3. Playwright MCP (E2E 테스트 자동화)

**목적**: 강사/수강생 UI를 자동으로 테스트하고 스크린샷 캡처

**활용 시나리오**:
- 강사 대시보드 (세션 관리, 히트맵, 코칭 UI) 검증
- 수강생 응답 UI 검증
- 크로스브라우저 테스트
- 실시간 기능(Realtime) 동작 확인

**설정 위치**: 프로젝트 MCP (`.claude/settings.json`)

**사용 예시**:
```typescript
// 새로 구현한 히트맵 컴포넌트 자동 검증
// → 강사가 세션을 열고 학생 응답이 실시간으로 표시되는지 확인
// → 스크린샷 캡처로 디자인 리뷰 가능
```

**추천 레벨**: ⭐⭐⭐⭐ (강력 권장, 나중에 추가 가능)

---

### 4. 다른 유용한 MCP들

| MCP | 용도 | Argos 필요도 |
|-----|------|-----------|
| **Atlassian** (Jira, Confluence) | 이슈 추적, 문서화 | ⭐ (사용 중이면 추천) |
| **GitHub** | PR 리뷰, 이슈 자동화 | ⭐⭐ (Git 통합 권장) |
| **Gmail** | 이메일 알림 자동화 | ⭐ (선택사항) |
| **Google Calendar** | 미팅 스케줄링 | ⭐ (팀 협력용) |

---

## 프로젝트 레벨 MCP 설정 방법

### 글로벌 MCP vs 프로젝트 MCP 차이

| 항목 | 글로벌 | 프로젝트 |
|------|--------|---------|
| **위치** | `~/.claude/settings.json` | `.claude/settings.json` |
| **범위** | 모든 프로젝트 적용 | 해당 프로젝트만 적용 |
| **수정 권한** | 사용자 개인 설정 | 팀 공유 설정 (버전 관리 권장) |
| **우선순위** | 프로젝트 설정이 오버라이드 | 글로벌 설정보다 우선 |

### 프로젝트 MCP 설정 파일 (`argos/.claude/settings.json`)

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(pnpm *)",
      "Bash(supabase *)",
      "Bash(vercel *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git switch *)",
      "Bash(git merge *)",
      "Bash(ls *)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)"
    ]
  },
  "mcp": {
    "global": [
      "context7",
      "supabase",
      "playwright"
    ],
    "project": {
      "context7": {
        "enabled": true,
        "description": "라이브러리 문서 자동 조회"
      },
      "supabase": {
        "enabled": true,
        "description": "Supabase 프로젝트 관리"
      },
      "playwright": {
        "enabled": true,
        "description": "E2E 테스트 및 브라우저 자동화"
      }
    }
  },
  "hooks": {
    "afterCommit": "npm run lint",
    "beforePush": "npm run test:unit"
  }
}
```

**주요 포인트**:
1. `permissions.allow` — 자동 허용되는 Bash 명령 (프롬프트 불필요)
2. `mcp.global` — 시스템 전역 MCP 목록
3. `mcp.project` — 이 프로젝트 전용 MCP 설정
4. `hooks` — Git 이벤트 후 자동 실행 명령

---

## 유용한 스킬 목록

### 🔧 Git 관련 스킬

| 스킬 | 용도 | 팀원 용도 |
|------|------|---------|
| **commit** | 규칙에 맞춘 커밋 자동화 | 모든 팀원 |
| **create-pr** | PR 자동 생성 | backend-dev, ai-engineer |
| **create-branch** | 기능별 브랜치 자동 생성 | 모든 팀원 |
| **git-pr-workflows** | PR 리뷰 흐름 자동화 | 코드 리뷰어 |

**사용 예시**:
```bash
# 커밋 스킬로 규칙 준수
/commit "feat: 히트맵 실시간 갱신 구현"
# → CLAUDE.md의 "커밋 컨벤션"을 자동으로 적용

# PR 자동 생성
/create-pr "AI 퀴즈 생성 엔드포인트 완성"
# → PR 제목, 설명, 라벨 자동 설정
```

---

### 🧪 테스트 관련 스킬

| 스킬 | 용도 | 필요도 |
|------|------|--------|
| **test-driven-development** | TDD 워크플로우 | ⭐⭐⭐⭐ |
| **playwright-skill** | Playwright 테스트 생성 | ⭐⭐⭐ |
| **e2e-testing-patterns** | E2E 테스트 패턴 | ⭐⭐⭐ |

**사용 예시**:
```bash
# 새로운 API 엔드포인트를 TDD로 구현
/test-driven-development
# → 테스트 먼저 작성 → 코드 구현 → 리팩토링

# 히트맵 UI의 E2E 테스트 작성
/playwright-skill
# → Playwright 테스트 자동 생성
```

---

### 📚 코드 품질 스킬

| 스킬 | 용도 | 필요도 |
|------|------|--------|
| **code-review-excellence** | 코드 리뷰 기준 정립 | ⭐⭐⭐ |
| **simplify** | 코드 간결화 | ⭐⭐⭐ |
| **type-safe-patterns** | TypeScript strict 모드 패턴 | ⭐⭐⭐⭐ |
| **typescript-expert** | TS 고급 타입 | ⭐⭐⭐ |

**사용 예시**:
```bash
# 복잡한 Zod 스키마 간결화
/simplify
# → 불필요한 코드 제거, 리팩토링 제안

# any 타입 제거 (절대 규칙 #16)
/typescript-expert "any 타입을 unknown으로 변경"
```

---

### 🚀 Next.js/Supabase 관련 스킬

| 스킬 | 용도 | 필요도 |
|------|------|--------|
| **nextjs-best-practices** | Next.js 14 App Router 패턴 | ⭐⭐⭐⭐ |
| **nextjs-supabase-auth** | Supabase Auth 통합 | ⭐⭐⭐ |
| **react-server-components** | Server Components 패턴 | ⭐⭐⭐⭐ |
| **postgres-best-practices** | PostgreSQL/Supabase SQL 최적화 | ⭐⭐⭐ |

---

### 🤖 AI 관련 스킬

| 스킬 | 용도 | 필요도 |
|------|------|--------|
| **gemini-api-dev** | Gemini 3 Flash API 활용 | ⭐⭐⭐⭐ |
| **vercel-ai-sdk-expert** | Vercel AI SDK (streamText, generateObject) | ⭐⭐⭐⭐ |
| **prompt-engineering** | AI 프롬프트 최적화 | ⭐⭐⭐ |
| **rag-implementation** | RAG 패턴 (컨텍스트 기반 AI) | ⭐ (선택사항) |

**사용 예시**:
```bash
# Gemini API로 퀴즈 생성 구현
/gemini-api-dev
# → 최신 Gemini API 문법, 모델 선택, 토큰 최적화

# Vercel AI SDK의 streamText 사용
/vercel-ai-sdk-expert "streamText로 실시간 코칭 메시지 생성"
```

---

### 🏗️ 아키텍처/설계 스킬

| 스킬 | 용도 | 필요도 |
|------|------|--------|
| **architecture** | 시스템 아키텍처 리뷰 | ⭐⭐⭐ |
| **domain-driven-design** | DDD 패턴 | ⭐⭐ |
| **microservices-patterns** | 마이크로서비스 패턴 | ⭐ (선택사항) |

---

## 커스텀 스킬 정의 방법

### 프로젝트 전용 스킬 생성

프로젝트 구조에 맞게 **Argos 프로젝트 전용 스킬**을 정의할 수 있습니다.

#### 1. 스킬 파일 생성

`.claude/skills/` 디렉토리에 스킬 정의 파일 생성:

```bash
mkdir -p /Users/sprtms16/IdeaProjects/argos/.claude/skills
```

#### 2. 예시: `generate-prompt.skill.md`

```markdown
# Generate AI Prompt

## Description
Argos 프로젝트의 AI 프롬프트를 자동으로 생성하고 검증합니다.

## Usage
```bash
/generate-prompt quiz
/generate-prompt coaching
/generate-prompt report
```

## Details
- `src/lib/ai/prompts/` 디렉토리에 프롬프트 저장
- Zod 스키마 자동 생성 (`src/lib/ai/schemas/`)
- KIT 교육 맥락 자동 포함
- few-shot 예시 5개 이상 포함 (권장)

## Examples
- 퀴즈 생성 프롬프트 (temperature=0.3)
- 코칭 프롬프트 (temperature=0.5)
- 리포트 분석 프롬프트 (temperature=0.5)
```

#### 3. 예시: `migrate-db.skill.md`

```markdown
# Generate Supabase Migration

## Description
Argos 데이터베이스 스키마 마이그레이션을 자동으로 생성합니다.

## Usage
```bash
/migrate-db "Add heatmap_data table with RLS policies"
```

## Details
- RLS 정책 자동 포함 (academy_id 기반 격리)
- 타입 생성 자동화 (`supabase gen types`)
- 롤백 스크립트 자동 생성
- 마이그레이션 파일명: `NNNNN_description.sql`

## Rules (CLAUDE.md 준수)
- 모든 테이블에 RLS 정책 필수 (규칙 #4)
- 파라미터 바인딩 필수 (규칙 #5)
```

#### 4. 커스텀 스킬 등록

`.claude/settings.json`에 다음 추가:

```json
{
  "skills": {
    "local": [
      {
        "name": "generate-prompt",
        "description": "Argos AI 프롬프트 생성",
        "path": ".claude/skills/generate-prompt.skill.md"
      },
      {
        "name": "migrate-db",
        "description": "Supabase 마이그레이션 생성",
        "path": ".claude/skills/migrate-db.skill.md"
      }
    ]
  }
}
```

---

## 추천 설정 파일

### 최종 `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(pnpm *)",
      "Bash(supabase *)",
      "Bash(vercel *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git branch *)",
      "Bash(git checkout *)",
      "Bash(git switch *)",
      "Bash(git merge *)",
      "Bash(git push)",
      "Bash(ls *)",
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)",
      "Bash(git reset --hard *)",
      "Bash(git rebase -i *)"
    ]
  },
  "mcp": {
    "global": [
      "context7",
      "supabase",
      "playwright"
    ],
    "project": {
      "context7": {
        "enabled": true,
        "description": "Next.js 14, Supabase, Vercel AI SDK, Zod, Gemini 문서 조회"
      },
      "supabase": {
        "enabled": true,
        "description": "Supabase 마이그레이션, RLS, 타입 생성 자동화"
      },
      "playwright": {
        "enabled": true,
        "description": "강사/수강생 UI E2E 테스트"
      }
    }
  },
  "hooks": {
    "afterCommit": "npm run lint && npm run type-check",
    "beforePush": "npm run test:unit"
  },
  "skills": {
    "recommended": [
      "commit",
      "create-pr",
      "create-branch",
      "nextjs-best-practices",
      "gemini-api-dev",
      "vercel-ai-sdk-expert",
      "typescript-expert",
      "playwright-skill",
      "test-driven-development"
    ],
    "local": [
      {
        "name": "generate-prompt",
        "description": "Argos AI 프롬프트 생성",
        "path": ".claude/skills/generate-prompt.skill.md"
      },
      {
        "name": "migrate-db",
        "description": "Supabase 마이그레이션 생성",
        "path": ".claude/skills/migrate-db.skill.md"
      }
    ]
  }
}
```

---

## 요약 및 시작하기

### Phase 1: 기본 설정 (즉시)
1. ✅ `.claude/settings.json` 업데이트 (Context7, Supabase, Playwright MCP 활성화)
2. ✅ Git 관련 스킬 활용 시작 (`/commit`, `/create-pr`)
3. ✅ 권장 스킬 북마크

### Phase 2: 개발 가속화 (1주)
4. AI 관련 스킬 활용 (`/gemini-api-dev`, `/vercel-ai-sdk-expert`)
5. TDD 워크플로우 도입 (`/test-driven-development`)
6. Playwright E2E 테스트 구축 시작

### Phase 3: 팀 효율성 극대화 (2주)
7. 커스텀 스킬 정의 및 등록
8. CI/CD 훅 설정 (자동 린트, 테스트)
9. 에이전트 팀 체계 최적화

---

**질문/피드백**: 이 가이드는 프로젝트 요구사항에 맞게 계속 업데이트됩니다.
