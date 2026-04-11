---
type: lib
id: lib-ai-schemas
related:
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-model]]"
  - "[[api-ai-quiz]]"
  - "[[api-ai-coaching]]"
  - "[[api-ai-report]]"
  - "[[api-ai-mentor-briefing]]"
sources:
  - "src/lib/ai/schemas/quiz.ts"
  - "src/lib/ai/schemas/report.ts"
  - "src/lib/ai/schemas/coaching.ts"
  - "src/lib/ai/schemas/mentor-briefing.ts"
  - "CLAUDE.md#AI"
updated: 2026-04-11
owner: analyst-2
---

# lib-ai-schemas — AI 응답 Zod 검증 스키마

## Summary

Gemini/Claude AI 응답을 런타임에 검증하는 Zod 스키마 모음. CLAUDE.md 규칙 #12 "AI 응답은 반드시 Zod 스키마로 검증 — 검증 없이 직접 사용 금지"의 직접 구현체.

## Key Claims

- `reportResponseSchema`는 `overallScore`, `topicResults[]`, `weakTopics[]`, `recommendations[]`, `encouragement` 필드를 검증한다. (`src/lib/ai/schemas/report.ts`)
- `GeneratedQuizQuestionSchema`는 `options: z.array(z.string()).min(2).max(5)` 제약 — 보기가 2개 미만이거나 6개 이상이면 검증 실패.
- Zod 검증 실패 시 API Route가 1회 재시도한다 (`AI_MAX_RETRY_COUNT = 1`). 재시도도 실패 시 `500` 반환.
- 모든 스키마 파일은 `src/lib/ai/schemas/` 하위 — API Route에 인라인 Zod 스키마 정의 금지.

## Intuition / Why

LLM 응답은 JSON을 반환하라 해도 텍스트를 섞거나 필드를 누락하거나 타입을 틀리는 경우가 있다. 런타임 Zod 검증 없이 `response.topicResults.map(...)` 같은 코드를 실행하면 TypeError로 500이 난다. Zod 검증으로 "AI가 계약을 지켰는가"를 확인하고, 위반 시 재시도 기회를 준다.

## Details

**스키마 파일 목록**:

| 파일 | 주요 스키마 | 검증 대상 |
|------|------------|----------|
| `quiz.ts` | `GeneratedQuizQuestionSchema`, `GeneratedQuizSchema` | 퀴즈 생성 응답 |
| `coaching.ts` | `coachingResponseSchema` | 실시간 코칭 응답 |
| `report.ts` | `reportResponseSchema` | 수강생 학습 리포트 |
| `mentor-briefing.ts` | `mentorBriefingSchema` | 멘토 AI 브리핑 |

`report.ts`의 핵심 스키마:
```ts
const reportResponseSchema = z.object({
  overallScore: z.number().min(0).max(100),
  topicResults: z.array(z.object({
    topic: z.string(),
    score: z.number().min(0).max(100),
    feedback: z.string(),
  })),
  weakTopics: z.array(z.string()),
  recommendations: z.array(z.string()),
});
```

## Connections

- [[lib-ai-prompts]] — sibling: 프롬프트가 요청하는 JSON 형식과 이 스키마가 검증하는 형식이 일치해야 함
- [[lib-ai-model]] — upstream: 모델 호출 → 응답 → 이 스키마로 검증 순서
- [[api-ai-quiz]] — downstream: quiz 스키마 사용
- [[api-ai-report]] — downstream: report 스키마 사용
- [[api-ai-mentor-briefing]] — downstream: mentor-briefing 스키마 사용

## Gotchas

- **프롬프트-스키마 불일치**: 프롬프트에서 `understanding_summary` 키를 요청하고 스키마에서 `topicResults`로 검증하면 항상 Zod 실패. 프롬프트 수정 시 스키마도 함께 수정 필요.
- **`z.number().min(0).max(100)` 범위**: AI가 `150`이나 `-5`를 반환하면 검증 실패 → 재시도. 재시도 후도 실패면 `500` — UI에서 "생성 실패" 표시.
- **`mentor-briefing.test.ts`, `report.test.ts`**: 프롬프트 구조 단위 테스트 존재. 스키마 변경 시 테스트도 같이 확인.
- **Zod v4 import**: `import { z } from "zod/v4"` — 프로젝트가 Zod v4를 사용. `from "zod"` 대신 `from "zod/v4"`로 import해야 최신 API 사용 가능.

## Changelog

- 2026-04-11 — `mentor-briefing.ts` 스키마 추가 (T4)
- 초기 — quiz, coaching, report 스키마 작성
