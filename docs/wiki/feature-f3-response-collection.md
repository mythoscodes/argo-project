---
type: feature
id: feature-f3-response-collection
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-understanding-score]]"
  - "[[concept-heatmap]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f4-heatmap]]"
  - "[[hook-use-realtime]]"
  - "[[role-student]]"
sources:
  - "src/app/api/responses/route.ts"
  - "src/hooks/use-realtime.ts"
  - "supabase/migrations/00001_initial_schema.sql#responses"
  - "docs/tc/instructor-session-detail.md#1-3 Heatmap"
updated: 2026-04-11
owner: planner
---

# F3: Response Collection (수강생 응답 수집)

## Summary

수강생이 퀴즈에 답안을 제출하면 `POST /api/responses`가 `responses` 테이블에 저장하고, 강사 화면의 `useRealtimeResponses` 훅이 Supabase Realtime으로 즉시 반영하는 기능. 응답 정오판정(`is_correct`)이 서버에서 자동 계산된다.

## Key Claims

- `POST /api/responses`는 `student` role만 허용한다; teacher/mentor/owner는 403을 받는다 — `src/app/api/responses/route.ts`
- `is_correct`는 클라이언트가 전송하지 않고, 서버가 `responses.selected_answer === quizzes.correct_answer`로 계산해 저장한다
- 동일 `(student_id, quiz_id)` 쌍의 중복 제출은 DB UNIQUE 제약으로 차단된다 — `migrations/00001_initial_schema.sql`
- `useRealtimeResponses`는 마운트 시 기존 응답을 전체 조회(`loadExisting()`)한 후, Realtime `INSERT` 이벤트를 구독해 증분 갱신한다 — `src/hooks/use-realtime.ts` L27-44
- 강사 화면에서 수강생이 `GET /api/quizzes`를 호출하면 아직 응답하지 않은 퀴즈의 `correct_answer`가 제거된 응답을 받는다 — `src/app/api/quizzes/route.ts` L62-88

## Intuition / Why

수강생이 답을 제출하는 순간 강사 화면에 반영되어야 한다. 5초 딜레이도 "이미 틀린 수강생"을 놓치는 원인이 된다. Supabase Realtime의 postgres_changes 구독이 이 실시간성을 HTTP 폴링 없이 달성한다.

서버측 정오 판정 이유: 클라이언트가 `is_correct=true`를 임의로 전송하는 조작을 방지한다. 정답은 서버에서만 비교된다.

## Details

### 응답 저장 흐름

```
수강생 → POST /api/responses { quizId, sessionId, selectedAnswer, responseTimeMs }
  → student role 확인
  → quizzes.correct_answer 조회 (서버에서만 접근)
  → is_correct = selectedAnswer === correct_answer
  → responses INSERT { ..., is_correct }
  → 201: { data }
```

### responses 테이블 핵심 컬럼

| 컬럼 | 역할 |
|------|------|
| `quiz_id` | 대상 퀴즈 |
| `student_id` | 응답 수강생 |
| `session_id` | 소속 세션 (중복 조회 최적화) |
| `selected_answer` | 선택한 답안 텍스트 |
| `is_correct` | 서버 계산 정오 여부 |
| `response_time_ms` | 응답 소요 시간 (위험 신호 speed 계산에 사용) |
| `round_number` | 퀴즈의 round_number 복사 (집계 편의) |

## Connections

- [[concept-session]] — upstream: active 세션에서만 응답 수집 작동
- [[concept-quiz]] — upstream: 응답의 정오 판정이 quiz.correct_answer 참조
- [[concept-understanding-score]] — downstream: 응답 데이터가 이해도 점수 계산의 원천
- [[concept-heatmap]] — downstream: responses가 히트맵 셀 계산의 입력
- [[feature-f2-quiz-generation]] — upstream: F2로 생성된 퀴즈가 F3 응답 대상
- [[feature-f4-heatmap]] — downstream: F4가 F3 응답 데이터를 실시간으로 시각화
- [[hook-use-realtime]] — implements: useRealtimeResponses 훅이 F3 데이터의 실시간 수신 담당
- [[role-student]] — upstream: 수강생만 응답 제출 가능

## Gotchas

- **Realtime 재연결 없음**: `CHANNEL_ERROR`/`TIMED_OUT` 시 에러 상태 전환 후 자동 재연결 없음 — `use-realtime.ts` L70-74. 강사 화면 갱신이 멈출 수 있다.
- **`loadExisting()`과 Realtime 구독 사이 응답 누락**: `loadExisting()` 완료와 `channel.subscribe()` 사이의 짧은 시간에 들어온 응답이 누락될 수 있다. 실제 발생 확률은 낮으나 고트래픽 환경에서 이론적 위험.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
