---
type: api
id: api-responses
related:
  - "[[rls-responses]]"
  - "[[api-ai-analysis]]"
  - "[[screen-student-session]]"
  - "[[hook-use-realtime]]"
  - "[[concept-understanding-score]]"
sources:
  - "src/app/api/responses/route.ts"
updated: 2026-04-11
owner: analyst-2
---

# api-responses — GET/POST /api/responses

## Summary

수강생 답변 제출(POST)과 응답 목록 조회(GET)를 처리. POST는 수강생 전용, GET은 강사는 세션 전체 / 수강생은 본인만 반환.

## Key Claims

- POST Zod: `{ quizId, sessionId, selectedAnswer: min(1).max(500), responseTimeMs?: 0~600000 }`.
- POST 역할 체크: `profile.role !== "student"` → 403.
- POST: 세션 active 상태 확인 (`status !== "active"` → 409).
- `is_correct` 서버 계산: `quiz.correct_answer.trim() === selectedAnswer.trim()`.
- 중복 응답: PostgreSQL unique violation `23505` → 409 `"이미 해당 퀴즈에 응답하셨습니다"`.
- POST 응답: 201 + 저장된 response 레코드.
- GET: `profile.role === "student"` → `.eq("student_id", user.id)` 추가 필터.

## Intuition / Why

정답 채점을 서버에서 수행해 클라이언트 조작 불가. trim() 처리로 앞뒤 공백 차이 허용. DB unique 제약으로 중복 응답 방지 — API 레벨에서 23505 에러 코드로 명시적 메시지 반환.

## Details

`round_number`는 quiz 테이블에서 가져와 responses 레코드에 함께 저장 — 분석/히트맵에서 라운드별 필터링에 사용.

GET은 `order("created_at", { ascending: true })`. 강사용 분석에서 응답 순서가 의미 있음.

## Connections

- [[rls-responses]] — upstream: INSERT(student_id=auth.uid()), SELECT(session_id 서브쿼리)
- [[api-ai-analysis]] — downstream: 이 responses 데이터를 집계해 이해도 계산
- [[screen-student-session]] — downstream: 수강생이 이 API로 답변 제출
- [[hook-use-realtime]] — see-also: Realtime으로 강사측에 응답 실시간 전달
- [[concept-understanding-score]] — see-also: is_correct 집계 → topic 정답률

## Gotchas

- **trim() 양방향**: `quiz.correct_answer.trim() === selectedAnswer.trim()` — DB에 저장된 정답에 공백이 있으면 trim 후 비교. 단, selectedAnswer도 trim — "A " 입력도 "A"로 처리.
- **23505 이외 에러**: unique 제약 외 DB 에러는 500으로 처리 — 에러 메시지가 `insertError.message`로 노출될 수 있음.
- **GET 학생 격리**: RLS도 있지만 API 레벨에서 `.eq("student_id", user.id)` 추가 — 이중 보호.

## Changelog

- 초기 — POST /api/responses 구현 (서버 채점, 중복 방지, 23505 처리)
- 초기 — GET /api/responses 구현 (role별 필터)
