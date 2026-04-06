# 코드 컨벤션

## 네이밍 규칙

### 파일/디렉토리
| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 파일 | `kebab-case.tsx` | `heatmap.tsx`, `quiz-card.tsx` |
| 유틸/라이브러리 | `kebab-case.ts` | `model.ts`, `utils.ts` |
| API Route | `route.ts` (디렉토리로 구분) | `api/ai/quiz/route.ts` |
| 훅 | `use-{name}.ts` | `use-realtime.ts` |
| 타입 | `kebab-case.ts` | `database.ts`, `ai.ts` |
| 디렉토리 | `kebab-case` | `quiz-generation/` |
| 마이그레이션 | `NNNNN_description.sql` | `00001_initial_schema.sql` |

### 코드 네이밍
| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수/함수 | `camelCase` | `getSessionById`, `quizResponses` |
| 컴포넌트 | `PascalCase` | `Heatmap`, `QuizCard` |
| 상수 | `UPPER_SNAKE_CASE` | `MAX_QUIZ_COUNT`, `DEFAULT_TEMPERATURE` |
| 타입/인터페이스 | `PascalCase` | `QuizResponse`, `SessionData` |
| Enum 값 | `snake_case` (DB) / `UPPER_SNAKE_CASE` (코드) | DB: `'code_output'`, 코드: `QuestionType.CODE_OUTPUT` |
| 환경변수 | `UPPER_SNAKE_CASE` | `AI_MODEL`, `SUPABASE_SERVICE_ROLE_KEY` |

### 금지 네이밍
```typescript
// X — 의미 없는 이름
const data = await fetch(...)
const result = process(input)
const temp = calculateScore()
const x = responses.filter(...)

// O — 의미 명확한 이름
const sessionData = await fetchSession(id)
const understandingScore = calculateUnderstanding(responses)
const weakTopics = responses.filter(r => r.score < 0.4)
```

## TypeScript 규칙

### strict mode 필수 사항
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### 타입 사용 규칙
```typescript
// X — any 금지
function processData(data: any) { ... }

// O — unknown + 타입 가드
function processData(data: unknown) {
  if (!isQuizResponse(data)) throw new Error('Invalid data')
  // data는 이제 QuizResponse 타입
}

// X — 타입 단언 남용
const quiz = data as QuizResponse

// O — Zod 파싱으로 안전한 타입 추출
const parsed = quizSchema.safeParse(data)
if (!parsed.success) throw new Error('Invalid quiz data')
const quiz = parsed.data  // 타입 안전
```

### import 정렬 순서
```typescript
// 1. 외부 라이브러리
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 2. 내부 라이브러리 (@/ 별칭)
import { createClient } from '@/lib/supabase/server'
import { getModel } from '@/lib/ai/model'

// 3. 타입 (type import)
import type { QuizResponse } from '@/types/ai'

// 4. 상대 경로 (같은 디렉토리)
import { quizPrompt } from './prompts/quiz-generation'
```

## React / Next.js 패턴

### Server vs Client Component 판단 기준
```
Server Component (기본):
  - 데이터 페칭
  - DB 쿼리
  - 정적 렌더링
  - SEO 중요 페이지
  - API Key 접근 필요

Client Component ('use client'):
  - useState, useEffect 필요
  - 이벤트 핸들러 (onClick, onChange)
  - 브라우저 API (localStorage, WebSocket)
  - 실시간 업데이트 (Supabase Realtime)
  - 애니메이션/인터랙션
```

### 에러 처리 패턴
```typescript
// API Route
export async function POST(req: NextRequest) {
  try {
    // ... 로직
    return NextResponse.json({ data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten() },
        { status: 400 }
      )
    }
    // 예상치 못한 에러는 500 + 일반 메시지 (내부 상세 노출 금지)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 응답 타입 통일
```typescript
// 모든 API 응답은 이 형태를 따름
type ApiResponse<T> = 
  | { data: T; error?: never }
  | { data?: never; error: string; details?: unknown }
```

## 상수 관리

```typescript
// src/lib/constants.ts
export const APP_NAME = 'Argos'
export const APP_DESCRIPTION = '100개의 눈으로 교실을 본다'

// 퀴즈 관련
export const MAX_QUIZ_COUNT = 5
export const MIN_QUIZ_COUNT = 3
export const QUIZ_TYPES = ['code_output', 'find_bug', 'fill_blank'] as const

// AI 관련
export const DEFAULT_TEMPERATURE_QUIZ = 0.3
export const DEFAULT_TEMPERATURE_COACHING = 0.5
export const AI_MAX_RETRIES = 1

// 세션 관련
export const JOIN_CODE_LENGTH = 6
export const MAX_PARTICIPANTS = 50

// 이해도 임계값
export const UNDERSTANDING_LOW_THRESHOLD = 0.4    // 40% 미만 = 취약
export const UNDERSTANDING_MEDIUM_THRESHOLD = 0.7  // 70% 미만 = 보통
export const DROPOUT_RISK_STREAK = 3              // 3회 연속 하락 = 이탈 위험
```

## 금지 사항 총정리

| 금지 | 대안 |
|------|------|
| `any` 타입 | `unknown` + 타입 가드, 또는 구체적 타입 |
| `console.log` (프로덕션) | 제거, 또는 구조화된 로깅 유틸 |
| 매직 넘버 | `constants.ts`에 상수 정의 |
| 인라인 프롬프트 | `src/lib/ai/prompts/`에 분리 |
| 클라이언트 AI 호출 | API Route 경유 |
| `NEXT_PUBLIC_` 남용 | 허용 목록 3개만 |
| Server Actions | API Route로 통일 |
| 미사용 import | 즉시 제거 |
| 주석 처리된 코드 | 삭제 (git history에 있음) |
| TODO 주석 방치 | TaskCreate로 태스크 등록 |
