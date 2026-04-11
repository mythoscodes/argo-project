---
type: feature
id: feature-f2-quiz-generation
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[feature-f1-session]]"
  - "[[feature-f3-response-collection]]"
  - "[[role-teacher]]"
sources:
  - "src/app/api/ai/quiz/route.ts"
  - "src/lib/ai/prompts/quiz-generation.ts"
  - "src/lib/ai/schemas/quiz.ts"
  - "src/lib/constants.ts#AI_TEMPERATURE_QUIZ"
  - "docs/tc/instructor-session-detail.md#1-2 Quiz"
updated: 2026-04-11
owner: planner
---

# F2: AI Quiz Generation (AI 퀴즈 생성)

## Summary

강사가 세션의 과목/주제/난이도를 지정하면 Gemini/Claude AI가 1~5개의 퀴즈를 즉시 생성·저장하는 기능. `POST /api/ai/quiz`가 핵심 엔드포인트이며, 중복 방지·소유권 이중 검증·1회 재시도 포함.

## Key Claims

- `POST /api/ai/quiz`는 `teacher/owner` role + `session.teacher_id === user.id` 이중 소유권 검증을 수행한다 — `src/app/api/ai/quiz/route.ts` L87, L130
- AI 생성 시 `temperature: AI_TEMPERATURE_QUIZ (0.3)` — 퀴즈 정확도 우선 — `route.ts` L43-46
- count 범위: `MIN_QUIZ_COUNT` ~ `MAX_QUIZ_COUNT` (1~5개), 기본값 `DEFAULT_QUIZ_COUNT` — `constants.ts`
- 동일 토픽 기존 문제를 프롬프트 "절대 중복 금지" 섹션에 삽입해 재퀴즈 중복을 방지한다 — `route.ts` L149-155
- Zod `QuizGenerationResponseSchema`로 AI 응답을 검증하고, 실패 시 1회 재시도 후 502 반환한다 — `route.ts` L197-218

## Intuition / Why

강사가 수업 중 직접 문제를 작성하면 5분~10분이 소요된다. AI가 30초 이내로 과목별 코드 중심 문제를 생성하면 즉각적인 이해도 측정이 가능하다. 5가지 유형(code_output, find_bug, fill_blank, multiple_choice, true_false) 중 코드 3종이 KIT 실습 위주 교육에 최적화됐다.

## Details

### 요청 입력 스키마

```typescript
{
  sessionId: uuid,
  subject: string (1-100),  // 예: "Spring Boot"
  topic: string (1-200),    // 예: "의존성 주입"
  count: number (1-5),      // default: DEFAULT_QUIZ_COUNT
  difficulty: "easy"|"medium"|"hard"|"mixed"  // default: "mixed"
}
```

### AI 파이프라인

```
Zod 검증 → 소유권 확인 → MAX(round_number)+1 계산
→ 기존 동일토픽 문제 조회
→ buildQuizSystemPrompt() + buildQuizUserPrompt(existingQuestions 포함)
→ generateText(Output.object) → Zod 검증
→ quizzes INSERT (round_number, order_index 포함)
→ 201: { data: savedQuizzes }
```

## Connections

- [[concept-session]] — upstream: 세션이 active이고 teacher_id 일치해야 실행 가능
- [[concept-quiz]] — implements: F2가 quiz 개념의 AI 생성 파이프라인 전체 구현
- [[lib-ai-prompts]] — uses: `quiz-generation.ts`의 buildQuizSystemPrompt/buildQuizUserPrompt
- [[lib-ai-schemas]] — uses: `quiz.ts`의 QuizGenerationResponseSchema로 AI 응답 검증
- [[feature-f1-session]] — upstream: F1로 생성된 active 세션이 있어야 F2 실행 가능
- [[feature-f3-response-collection]] — downstream: F2 생성 퀴즈가 F3 응답 수집의 대상
- [[role-teacher]] — upstream: teacher/owner만 F2 실행 가능

## Gotchas

- **`code_snippet` Zod 미검증**: 코드 유형(code_output/find_bug/fill_blank)에서 code_snippet이 `nullable().optional()`이라 AI가 null을 반환해도 통과한다 — `quiz.ts` L16.
- **round_number 클라이언트 미지정**: 클라이언트가 `round_number`를 보낼 수 없다. 항상 서버가 MAX+1로 계산. 피드백 루프(재퀴즈)의 회차 구분이 이 로직에 전적으로 의존한다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
