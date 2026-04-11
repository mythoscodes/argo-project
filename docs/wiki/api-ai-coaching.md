---
type: api
id: api-ai-coaching
related:
  - "[[api-ai-analysis]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[lib-ai-model]]"
  - "[[lib-constants]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/app/api/ai/coaching/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-ai-coaching — POST /api/ai/coaching

## Summary

세션의 이해도 데이터와 오답 패턴을 바탕으로 AI 교수법 코칭 제안을 생성. 강사/원장 전용. `analysis_results` 테이블에 `analysis_type="coaching"`으로 저장.

## Key Claims

- 인가: `role IN ('owner', 'teacher')` — mentor 불가.
- 요청 Zod: `{ sessionId: uuid }`.
- 세션 소유권 확인: `session.teacher_id !== user.id` → 403.
- 이해도 데이터 소스: `analysis_results`에서 최신 `realtime` 타입 조회 → 없으면 responses에서 직접 계산 (fallback).
- 오답 패턴: `{quiz_id}::{selectedAnswer}` 키로 집계.
- `topic`: `session.subject + " - " + topics[0]` 조합. topics 없으면 subject만.
- AI 실패 시 1회 재시도, 2회 실패 → 502.
- 저장: `analysis_type="coaching"`, `coaching_suggestion = JSON.stringify(result)`.

## Intuition / Why

강사가 퀴즈 결과를 보고 "어떻게 다시 설명할까?" 버튼을 누르면 AI가 약점 토픽 기반으로 교수법을 제안. analysis_results fallback이 있어 별도 분석 실행 없이도 코칭 가능.

## Details

```ts
// temperature: 0.5 — 코칭은 자연스러운 제안과 다양한 교수법 아이디어가 필요
temperature: AI_TEMPERATURE_COACHING,
output: Output.object({ schema: coachingResponseSchema }),
```

fallback 경로: `analysis_results`에 최신 realtime 분석이 없으면 responses+quizzes를 직접 쿼리해 understandingScores 계산.

## Connections

- [[api-ai-analysis]] — upstream: analysis_results에서 최신 이해도 조회
- [[lib-ai-prompts]] — upstream: buildCoachingSystemPrompt(), buildCoachingUserPrompt()
- [[lib-ai-schemas]] — upstream: coachingResponseSchema
- [[lib-ai-model]] — upstream: getModel("coaching")
- [[lib-constants]] — upstream: AI_TEMPERATURE_COACHING, AI_MAX_RETRY_COUNT
- [[screen-instructor-session-detail]] — downstream: "AI 코칭" 버튼

## Gotchas

- **fallback 경로 복잡도**: analysis_results 없으면 responses+quizzes 4개 쿼리 추가. N+1 위험은 없지만 레이턴시 증가.
- **isUnderstandingScores 타입 가드**: `Json | null` 타입의 understanding_scores를 `Record<string, number>`로 검증. 잘못된 데이터 시 fallback 경로로 전환.
- **coaching_suggestion 저장**: `JSON.stringify()` — 조회 시 클라이언트가 `JSON.parse()` 필요.

## Changelog

- 초기 — POST /api/ai/coaching 구현 (fallback 경로, 1회 retry, analysis_type="coaching")
