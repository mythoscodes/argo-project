---
type: api
id: api-quizzes
related:
  - "[[api-ai-quiz]]"
  - "[[rls-sessions]]"
  - "[[screen-instructor-session-detail]]"
  - "[[screen-student-session]]"
  - "[[concept-quiz]]"
sources:
  - "src/app/api/quizzes/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-quizzes — GET /api/quizzes

## Summary

세션의 퀴즈 목록을 조회하는 엔드포인트. 강사는 `correct_answer` 포함 전체 조회, 수강생은 미응답 퀴즈의 `correct_answer`를 제거하여 반환.

## Key Claims

- `?sessionId` (UUID): 필수 파라미터. 누락/비UUID → 400.
- 강사/원장/멘토: `select("*")` — correct_answer 포함 전체 반환.
- 수강생: 본인이 응답 완료한 quiz_id 목록 조회 → 미완료 퀴즈에서 `correct_answer` 제거.
- 응답 완료 판별: `responses` 테이블에서 `quiz_id + student_id` 조합으로 확인.
- `order_index` 오름차순 정렬.

## Intuition / Why

수강생이 퀴즈를 푸는 동안 정답이 노출되면 안 된다. 단, 이미 제출한 퀴즈는 정답을 보여줘도 된다(복습). 응답 완료 여부를 API에서 판별해 필드를 동적으로 제거.

## Details

```ts
type QuizForStudent = Omit<QuizRow, "correct_answer">;
// completedQuizIds에 없는 퀴즈: correct_answer 제거 후 반환
const { correct_answer: _omitted, ...quizWithoutAnswer } = quiz;
```

POST는 없음 — 퀴즈 저장은 `POST /api/ai/quiz`에서 담당. 이 엔드포인트는 읽기 전용.

## Connections

- [[api-ai-quiz]] — upstream: AI 퀴즈 생성 후 quizzes 테이블에 저장
- [[rls-sessions]] — see-also: sessions RLS가 academy_id 격리 (quizzes는 sessions 종속)
- [[screen-instructor-session-detail]] — downstream: 강사 화면에서 퀴즈 목록 표시
- [[screen-student-session]] — downstream: 수강생 화면에서 실시간 퀴즈 수신
- [[concept-quiz]] — see-also: 퀴즈 5가지 유형, round_number

## Gotchas

- **POST 없음**: 직접 퀴즈 저장 API가 없다. 반드시 `POST /api/ai/quiz` 경유.
- **correct_answer 제거 타이밍**: 응답 제출 직후 재조회 시 해당 퀴즈에 correct_answer가 포함된다. 클라이언트가 응답 제출 후 목록 새로고침하면 정답이 보일 수 있음.
- **RLS 의존**: quizzes 테이블 RLS는 sessions 서브쿼리 기반 — sessions RLS 회귀 시 quizzes 노출될 수 있음.

## Changelog

- 초기 — GET /api/quizzes 구현 (수강생 correct_answer 제거 로직 포함)
