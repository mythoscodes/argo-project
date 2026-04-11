---
type: role
id: role-student
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-join-code]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f1-session]]"
  - "[[feature-f3-response-collection]]"
  - "[[feature-f7-report]]"
  - "[[role-teacher]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#profiles"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "src/app/api/sessions/join/route.ts"
  - "src/app/api/responses/route.ts"
  - "src/app/api/quizzes/route.ts"
updated: 2026-04-11
owner: planner
---

# Role: Student (수강생)

## Summary

KIT 직업훈련 과정의 학습자. join_code로 active 세션에 참여하고, 퀴즈에 응답을 제출하는 유일한 역할. `profiles.role = 'student'`이며 API 쓰기 권한이 가장 제한적이다.

## Key Claims

- `POST /api/sessions/join`은 `student` role만 허용한다; teacher/mentor/owner는 403 — `src/app/api/sessions/join/route.ts` L48
- `POST /api/responses`는 `student` role만 허용한다 — `src/app/api/responses/route.ts`
- `GET /api/quizzes`에서 student는 미응답 퀴즈의 `correct_answer`를 받지 못한다; 응답 완료 퀴즈에만 정답 노출 — `src/app/api/quizzes/route.ts` L62-88
- `GET /api/sessions` 응답에서 student는 참여한 세션만 조회되며 `join_code` 필드가 제거된다 — `sessions/route.ts` L66
- student는 `session_participants` INSERT 시 `student_id = auth.uid()`만 가능하다; 타인 명의 참여 불가 — `migrations/00006` L83-86

## Intuition / Why

수강생의 역할은 최소한의 읽기(퀴즈, 세션 정보)와 자신의 응답 제출만 허용한다. 정답을 미리 보거나, 타 수강생 명의로 응답하거나, 세션을 직접 조작하는 것을 원천 차단한다. 데이터 신뢰성이 이해도 분석의 기반이기 때문이다.

## Details

### 수강생 수업 참여 흐름

```
1. POST /api/sessions/join { joinCode: "ABC123" }
   → session_participants UPSERT (멱등)
   → sessionId 반환

2. GET /api/quizzes?sessionId=... (correct_answer 제외)

3. POST /api/responses { quizId, sessionId, selectedAnswer, responseTimeMs }
   → is_correct 서버 계산 → 저장

4. GET /api/quizzes?sessionId=... (응답 완료 퀴즈는 correct_answer 포함)

5. (세션 종료 후) GET /api/ai/report?sessionId=...&studentId=self
```

### 허용 작업 목록

| 작업 | 엔드포인트 | 조건 |
|------|-----------|------|
| 세션 참여 | `POST /api/sessions/join` | role=student, active 세션 |
| 퀴즈 조회 | `GET /api/quizzes` | 참여 세션, 정답 제한 |
| 응답 제출 | `POST /api/responses` | role=student |
| 본인 리포트 조회 | `GET /api/ai/report` | student_id=self (RLS) |
| 참여 세션 목록 | `GET /api/sessions` | 참여 세션만, join_code 제외 |

## Connections

- [[concept-session]] — downstream: 수강생은 active 세션에 join_code로 참여
- [[concept-quiz]] — downstream: 수강생이 퀴즈의 소비자 (응답 제출)
- [[concept-join-code]] — downstream: join_code를 사용해 세션에 입장하는 주체
- [[concept-academy-isolation]] — downstream: student의 데이터 접근이 academy_id RLS를 따름
- [[feature-f1-session]] — uses: F1의 /api/sessions/join이 수강생 입장 엔드포인트
- [[feature-f3-response-collection]] — upstream: 수강생이 F3의 응답 제출 주체
- [[feature-f7-report]] — downstream: 수강생이 본인 리포트를 조회하는 소비자
- [[role-teacher]] — see-also: 강사가 수강생의 이해도를 분석하는 관계

## Gotchas

- **anonymous_mode와 display_name**: `sessions.anonymous_mode=true`이면 강사 화면에서 수강생 이름이 "익명"으로 표시된다. 수강생 본인에게는 영향 없음. RLS/API 레벨이 아닌 프론트엔드 표시 로직으로 처리된다.
- **중복 참여 멱등 처리**: `session_participants` UPSERT는 `onConflict: "session_id,student_id"`로 동일 세션 재참여를 허용한다. 이미 참여한 세션에 다시 join_code를 입력해도 201이 반환된다 — `join/route.ts` L78-80.
- **응답 중복 제출 차단**: `responses` 테이블에 `(student_id, quiz_id)` UNIQUE 제약이 있어 같은 퀴즈에 두 번 응답 불가. 클라이언트 UX에서도 제출 후 재제출 버튼 비활성화 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
