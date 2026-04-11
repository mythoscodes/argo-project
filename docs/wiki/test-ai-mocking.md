---
type: test
id: test-ai-mocking
related:
  - "[[test-e2e-strategy]]"
  - "[[api-ai-quiz]]"
  - "[[api-ai-analysis]]"
  - "[[api-ai-coaching]]"
  - "[[api-ai-report]]"
  - "[[api-ai-mentor-briefing]]"
  - "[[lib-ai-schemas]]"
sources:
  - "tests/e2e/fixtures/helpers.ts"
  - "src/lib/ai/schemas/"
updated: 2026-04-11
owner: team-lead
---

# AI 호출 모킹 전략

## Summary

Playwright `page.route('/api/ai/**')` 로 5개 AI API를 모두 스텁. Zod 스키마를 준수하는 고정 응답을 반환하여 결정적·빠름·무료 테스트 달성.

## Key Claims

- `tests/e2e/fixtures/helpers.ts`의 `stubAiRoutes(page)` 헬퍼가 5개 AI 엔드포인트를 가로챈다: `/api/ai/quiz`, `/api/ai/analysis`, `/api/ai/coaching`, `/api/ai/report`, `/api/ai/mentor-briefing`.
- 스텁 응답은 각 [[lib-ai-schemas]] Zod 스키마를 통과하는 최소 유효 객체이다. E2E가 프론트 렌더링 로직만 검증.
- 실제 Gemini/Claude 호출은 E2E 중 0건 — `GOOGLE_GENERATIVE_AI_API_KEY` 환경변수 없이도 E2E 실행 가능.
- AI 응답 내용 자체의 품질 검증은 [[api-ai-quiz]] 의 integration test (vitest)에서 수행 — E2E 책임 아님.

## Intuition / Why

**스텁 vs 실호출**: 실호출은 ① 3-10초 지연, ② 같은 프롬프트에도 다른 응답, ③ 토큰 비용(매 실행). 1024개 테스트 × 5개 AI 호출 = 5120회 호출이면 무의미한 비용. 스텁은 밀리초·결정적·무료.

**품질 검증은 분리**: AI 응답의 **품질**(정답률, 오답 분포, 일관성)은 `vitest` 기반 integration test에서 실제 호출로 검증. E2E는 **UI와 API 계약**만 본다.

## Details

스텁 헬퍼 패턴 (개념):
```ts
// tests/e2e/fixtures/helpers.ts
export async function stubAiRoutes(page: Page) {
  await page.route('**/api/ai/quiz', route =>
    route.fulfill({ json: { data: MOCK_QUIZ_RESPONSE } })
  );
  await page.route('**/api/ai/analysis', route =>
    route.fulfill({ json: { data: MOCK_ANALYSIS_RESPONSE } })
  );
  // ... 나머지 3개
}
```

각 MOCK 응답은 [[lib-ai-schemas]]의 Zod 스키마(`quizResponseSchema`, `analysisResponseSchema`, …)를 실제로 `.parse()` 해서 통과하는지 사전 검증된 fixture.

## Connections

- [[test-e2e-strategy]] — upstream: E2E 전략이 이 모킹을 명시적으로 요구
- [[api-ai-quiz]] / [[api-ai-analysis]] / [[api-ai-coaching]] / [[api-ai-report]] / [[api-ai-mentor-briefing]] — uses: 모킹 대상 5개 엔드포인트
- [[lib-ai-schemas]] — uses: 모든 MOCK 응답은 여기 정의된 Zod 스키마로 사전 검증

## Gotchas

- **스키마 드리프트 위험**: [[lib-ai-schemas]]가 변경되면 MOCK 응답도 동시 갱신 필요. E2E 실패 시 "스키마 위반"이면 스텁 업데이트 누락.
- **스텁 범위**: `page.route('**/api/ai/**')` 와일드카드는 `/api/ai/quiz`, `/api/ai/quiz-review` 등 모든 하위 경로 가로챔. 향후 새 AI 엔드포인트 추가 시 즉시 MOCK 필요.
- **Network 의존 테스트 금지**: E2E에서 AI 품질을 검증하려 `page.route` 를 우회하려 하지 말 것. vitest integration 계층을 활용.

## Changelog

- 2026-04-11 — 초판. Cycle 1 전략 정리 (team-lead)
