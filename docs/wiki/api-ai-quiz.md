---
type: api
id: api-ai-quiz
related:
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[lib-ai-model]]"
  - "[[lib-constants]]"
  - "[[api-quizzes]]"
  - "[[concept-quiz]]"
  - "[[screen-instructor-session-detail]]"
sources:
  - "src/app/api/ai/quiz/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-ai-quiz — POST /api/ai/quiz

## Summary

Gemini 3 Flash로 퀴즈 JSON을 생성하고 `quizzes` 테이블에 저장하는 엔드포인트. 강사/원장 전용. 실패 시 1회 재시도.

## Key Claims

- 인가: `role IN ('owner', 'teacher')` — mentor/student 접근 불가, 403.
- 요청 Zod: `{ sessionId, subject, topic, count: MIN_QUIZ_COUNT~MAX_QUIZ_COUNT (default DEFAULT_QUIZ_COUNT), difficulty: easy|medium|hard|mixed }`.
- 세션 소유권 확인: `session.teacher_id !== user.id` → 403.
- `round_number`: 기존 최대 round_number + 1 (첫 생성 시 1).
- 동일 topic 기존 문제 조회 → `existingQuestions`로 프롬프트 전달 (중복 방지).
- AI 실패 시 `generateQuizzesWithRetry()` — 1회 재시도, 2회 모두 실패 시 502.
- 성공 시 201 + 저장된 quizzes 배열.

## Intuition / Why

퀴즈 생성은 강사가 세션 중 실시간으로 트리거. round_number 자동 증분으로 동일 세션에서 여러 라운드 생성 가능 (F6 피드백루프). existingQuestions 전달로 같은 질문이 반복 생성되지 않음.

## Details

```ts
// temperature: 0.3 — 퀴즈는 정확도 우선, 창의성 최소화
temperature: AI_TEMPERATURE_QUIZ,
output: Output.object({ schema: QuizGenerationResponseSchema }),
```

`Output.object()` — Vercel AI SDK v6 방식. generateText + Output.object 조합으로 구조화 출력.

## Connections

- [[lib-ai-prompts]] — upstream: buildQuizSystemPrompt(), buildQuizUserPrompt()
- [[lib-ai-schemas]] — upstream: QuizGenerationResponseSchema (Zod v4)
- [[lib-ai-model]] — upstream: getModel("quiz")
- [[lib-constants]] — upstream: AI_TEMPERATURE_QUIZ, AI_MAX_RETRY_COUNT, MIN/MAX/DEFAULT_QUIZ_COUNT
- [[api-quizzes]] — downstream: 저장 후 GET /api/quizzes로 조회
- [[concept-quiz]] — see-also: 퀴즈 5유형, misconception_tags, round_number
- [[screen-instructor-session-detail]] — downstream: 강사 화면에서 "AI 퀴즈 생성" 버튼

## Gotchas

- **502 vs 500**: AI 생성 실패 → 502 (외부 서비스 오류). DB 저장 실패 → 500.
- **재시도 로직**: try-catch 2중 중첩 — 첫 번째 실패 시 즉시 2번째 시도. AI 레이턴시가 길어질 수 있음.
- **소유권 체크**: `session.teacher_id !== user.id` — owner는 본인이 만든 세션만 가능. 다른 강사 세션에 퀴즈 생성 불가.

## Changelog

- 초기 — POST /api/ai/quiz 구현 (round_number 자동, existingQuestions 중복방지, 1회 retry)
