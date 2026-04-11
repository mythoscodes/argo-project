---
type: feature
id: feature-f5-ai-coaching
related:
  - "[[concept-understanding-score]]"
  - "[[concept-quiz]]"
  - "[[lib-ai-prompts]]"
  - "[[lib-ai-schemas]]"
  - "[[feature-f4-heatmap]]"
  - "[[feature-f6-feedback-loop]]"
  - "[[role-teacher]]"
sources:
  - "src/app/api/ai/coaching/route.ts"
  - "src/lib/ai/prompts/coaching.ts"
  - "src/lib/ai/schemas/coaching.ts"
  - "src/lib/constants.ts#AI_TEMPERATURE_COACHING"
  - "docs/tc/instructor-session-detail.md#1-4 Coaching"
updated: 2026-04-11
owner: planner
---

# F5: AI Coaching (AI 코칭)

## Summary

강사가 퀴즈 결과를 보고 "AI 코칭 생성" 버튼을 누르면, AI가 약점 토픽·오답 패턴을 분석해 강사에게 교수법 제안과 재설명 가이드를 제공하는 기능. `POST /api/ai/coaching`이 핵심 엔드포인트.

## Key Claims

- `POST /api/ai/coaching`은 `teacher/owner` role만 허용한다 — `src/app/api/ai/coaching/route.ts` L87 전후
- AI 생성 시 `temperature: AI_TEMPERATURE_COACHING (0.5)` — 코칭은 다양한 교수법 아이디어가 필요해 퀴즈(0.3)보다 높다 — `route.ts` L48-49
- 입력 컨텍스트: 최신 `analysis_results`의 `understanding_scores` + `misconception_clusters`를 로딩해 AI 프롬프트에 주입한다
- AI 응답은 `coachingResponseSchema`(Zod)로 검증되며, 실패 시 1회 재시도 후 502 반환한다

## Intuition / Why

강사가 "배열 인덱스 27점"이라는 숫자만 받으면 어떻게 재설명해야 할지 막막하다. AI가 `misconception_tags`(흔한 오해 패턴)를 분석해 "수강생들이 0-based 인덱싱을 혼동하고 있습니다. 배열 길이와 마지막 인덱스를 그림으로 비교하는 방법을 사용해보세요"처럼 구체적 제안을 준다.

`temperature=0.5` 선택 이유: 퀴즈(0.3)는 정확도가 우선이지만 코칭은 다양한 교수법 접근법이 창의적으로 제안될수록 좋다. 너무 높으면 부정확한 개념이 포함될 수 있어 중간값으로 설정.

## Details

### 코칭 생성 흐름

```
POST /api/ai/coaching { sessionId }
  → teacher 확인 → 최신 analysis_results 조회
  → weak_topics + misconception_clusters 추출
  → buildCoachingSystemPrompt() + buildCoachingUserPrompt(weakTopics, patterns)
  → generateText(temperature=0.5)
  → Zod coachingResponseSchema 검증
  → 결과 반환 (저장 없음 — on-demand 생성)
```

### 코칭 응답 구조 (coachingResponseSchema)

- `summary`: 전체 학급 이해도 요약 1~2문장
- `topicCoachings`: 토픽별 코칭 배열
  - `topic`: 토픽명
  - `score`: 이해도 점수
  - `explanation`: 재설명 방법
  - `suggestedActivities`: 활동 제안 배열
- `overallSuggestion`: 전체 수업 방향 제안

## Connections

- [[concept-understanding-score]] — upstream: weak_topics와 misconception_clusters가 코칭 입력
- [[concept-quiz]] — upstream: misconception_tags 데이터가 오답 패턴 분석에 사용
- [[lib-ai-prompts]] — uses: `coaching.ts`의 buildCoachingSystemPrompt/buildCoachingUserPrompt
- [[lib-ai-schemas]] — uses: `coaching.ts`의 coachingResponseSchema
- [[feature-f4-heatmap]] — upstream: 히트맵의 빨간 셀이 코칭 필요 신호 → 강사가 코칭 트리거
- [[feature-f6-feedback-loop]] — downstream: 코칭 후 강사가 재퀴즈(F6)를 생성하는 흐름
- [[role-teacher]] — upstream: 강사만 AI 코칭 트리거 가능

## Gotchas

- **코칭 결과 미저장**: `POST /api/ai/coaching` 응답이 DB에 저장되지 않는다. 동일 세션 코칭을 두 번 생성하면 서로 다른 결과가 나올 수 있다. 코칭 이력이 필요하면 별도 테이블 추가 필요.
- **`analysis_results` 없을 때 동작**: 최신 분석 결과가 없으면 (POST /api/ai/analysis를 아직 호출하지 않은 경우) 코칭 입력이 빈 컨텍스트가 된다. AI가 일반적인 교수법만 제안할 수 있다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
