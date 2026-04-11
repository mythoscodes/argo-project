---
type: concept
id: concept-session
related:
  - "[[concept-join-code]]"
  - "[[concept-quiz]]"
  - "[[concept-heatmap]]"
  - "[[concept-understanding-score]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f1-session]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f3-response-collection]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
  - "[[role-mentor]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#sessions"
  - "src/app/api/sessions/route.ts"
  - "src/app/api/sessions/[id]/route.ts"
  - "docs/tc/instructor-session-detail.md"
  - "docs/tc/instructor-session-new.md"
  - "CLAUDE.md#MVP 우선순위"
updated: 2026-04-11
owner: planner
---

# Session (수업 세션)

## Summary

Argos에서 강사가 개설하는 실시간 수업의 최상위 컨테이너. draft→active→completed 3단계 생애주기를 가지며, 퀴즈·응답·분석·참여자 모든 데이터가 세션에 귀속된다.

## Key Claims

- `sessions.status` CHECK 제약은 `'draft'`, `'active'`, `'completed'` 세 값만 허용한다 — `migrations/00001_initial_schema.sql` L70
- `join_code`는 INSERT(draft 생성) 시 NULL이며, `PATCH status='active'` 시에만 서버가 생성·저장한다 — T7-hotfix, `src/app/api/sessions/[id]/route.ts`
- `POST /api/sessions`는 `teacher` 또는 `owner` role만 허용한다; `mentor`, `student`는 403을 받는다 — `route.ts` L112
- `GET /api/sessions`에서 mentor와 student는 `academy_id` 기반 RLS로 같은 학원 세션을 조회할 수 있다 — `sessions_select_same_academy` RLS 정책
- `sessions.academy_id`는 생성 시 서버가 teacher의 `profiles.academy_id`에서 자동 복사한다; 클라이언트가 직접 지정하지 않는다 — `route.ts` L144
- `sessions.anonymous_mode = true` 이면 강사 화면에서 수강생 실명 대신 "익명" 라벨이 표시된다

## Intuition / Why

KIT 직업훈련 환경에서 강사는 매 수업마다 "지금 이 반 수강생이 이해하고 있는가"를 실시간으로 확인하고 싶다. 세션은 그 단위이다. 하나의 세션이 하나의 수업(보통 3~4시간)에 대응하며, 수업 중 AI 퀴즈 → 응답 수집 → 이해도 분석 → 재퀴즈(피드백 루프)가 세션 내에서 반복된다.

3단계 생애주기를 도입한 이유: draft 상태에서 join_code를 미리 발급하면 수강생이 수업 시작 전 입장하거나, 코드가 외부에 노출될 위험이 있다. `active` 전환 시 코드를 발급함으로써 입장 시점을 강사가 통제한다.

## Details

세션의 핵심 컬럼:

| 컬럼 | 역할 |
|------|------|
| `teacher_id` | 세션 소유자 (INSERT/UPDATE 권한) |
| `academy_id` | 학원 격리 단위 (RLS 기준) |
| `status` | `draft` → `active` → `completed` |
| `join_code` | `active` 시 6자리 영숫자, draft 시 NULL |
| `topics` | JSONB 배열. AI 퀴즈 생성 컨텍스트로 사용 |
| `anonymous_mode` | 수강생 익명화 여부 (default `true`) |

세션에 종속된 엔티티: `quizzes`, `session_participants`, `responses`, `analysis_results`, `student_reports`.

## Connections

- [[concept-join-code]] — downstream: join_code는 세션이 active가 될 때 생성되는 세션의 하위 개념
- [[concept-quiz]] — downstream: 퀴즈는 세션에 귀속되며 round_number로 회차를 구분
- [[concept-heatmap]] — downstream: 히트맵은 세션 내 응답 데이터를 시각화
- [[concept-understanding-score]] — downstream: 이해도 점수는 세션 단위로 집계
- [[concept-academy-isolation]] — upstream: 세션의 RLS는 academy_id 기반 격리 정책을 따름
- [[feature-f1-session]] — implements: F1이 이 개념의 end-to-end 구현
- [[feature-f2-quiz-generation]] — downstream: 퀴즈 생성은 세션 컨텍스트(topics, subject) 필요
- [[feature-f3-response-collection]] — downstream: 응답 수집은 active 세션에서만 작동
- [[role-teacher]] — upstream: 강사만 세션을 생성·전환할 수 있음
- [[role-student]] — see-also: 수강생은 join_code로 active 세션에 참여
- [[role-mentor]] — see-also: mentor는 academy_id 기반으로 세션을 조회(읽기)만 가능

## Gotchas

- **join_code draft 노출 회귀**: QA 3차 사이클(커밋 `236a658`)에서 `POST /api/sessions` 응답에 `join_code`가 포함된 것이 발견됐다. T7-hotfix에서 join_code를 draft 시 NULL로 수정. `ISD-ERR-001`, `ISN-API-005` TC로 자동화 고정됨.
- **mentor 세션 접근 범위**: mentor는 academy_id 기반 RLS로 학원 내 전체 세션을 조회할 수 있다. "배정 세션만" 정책은 현재 미구현이며 Cycle 2 plan §2에서 학원 전체 접근으로 공식 확정.
- **`isTeacher` 변수명**: `GET /api/sessions`에서 `const isTeacher = ["owner", "teacher"].includes(profile.role)` 코드가 mentor를 포함하지 않아 mentor는 수강생 분기(참여 세션만)로 떨어졌다. T4에서 mentor도 강사 분기로 처리하도록 수정됨(`isStaff`로 리네임 또는 동등 처리).
- **`completed → active` 역전환**: DB CHECK 제약이 없어 API가 명시적으로 차단하지 않으면 completed 세션을 다시 active로 되돌릴 수 있다. `ISD-API-004` TC로 정책 확인 필요.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
