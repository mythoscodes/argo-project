---
type: role
id: role-mentor
related:
  - "[[concept-session]]"
  - "[[concept-risk-signal]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f8-owner-dashboard]]"
  - "[[feature-f9-sharing]]"
  - "[[role-teacher]]"
  - "[[role-owner]]"
  - "[[role-student]]"
sources:
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "src/app/api/mentor/students/route.ts"
  - "src/app/api/mentor/students/[id]/route.ts"
  - "src/app/api/ai/mentor-briefing/route.ts"
  - "src/app/api/auth/register/route.ts"
  - "docs/tc/register.md#REG-UI-004"
updated: 2026-04-11
owner: planner
---

# Role: Mentor (멘토)

## Summary

KIT 직업훈련 학원의 학생 지도 담당 상담사. 수강생 이탈 위험도를 모니터링하고 상담을 진행하는 역할. `profiles.role = 'mentor'`이며, Cycle 1 스프린트에서 추가된 신규 역할 (migration 00007).

## Key Claims

- `profiles.role` CHECK 제약에 `'mentor'`가 migration 00007에서 추가됐다; 이전에는 DB INSERT 시 constraint violation 발생 — `migrations/00007_add_mentor_role.sql` L10
- mentor는 `GET /api/sessions` 조회 시 `academy_id` 기반으로 학원 전체 세션을 조회한다; "배정된 세션만" 정책은 미구현 — `src/app/api/sessions/route.ts` (isStaff 분기)
- mentor는 `GET/POST /api/ai/analysis`, `POST /api/ai/report`에 접근 가능하다 (teacher와 동급 읽기+생성)
- mentor는 `consultation_notes` SELECT 시 학원 전체 상담 기록을 조회할 수 있다; teacher는 본인 작성 기록만 — `migrations/00007` L28-34
- mentor는 `POST /api/sessions`(세션 생성), `POST /api/ai/quiz`(퀴즈 생성)에 403을 받는다 — `sessions/route.ts` L112, `ai/quiz/route.ts` L87

## Intuition / Why

KIT 직업훈련 환경에서 수강생 관리는 담당 강사 외에 별도의 상담·관리 인력(멘토)이 필요하다. 멘토는 수업을 직접 진행하지 않지만 수강생이 중도 포기하지 않도록 지원한다. Argos의 위험 신호 데이터를 활용해 멘토가 "지금 상담이 필요한 수강생"을 빠르게 파악한다.

mentor role이 Cycle 1에서 늦게 추가된 이유: 초기 MVP 설계(owner/teacher/student)에서 mentor가 누락됐다가, QA 과정에서 `/register`에서 mentor 선택이 필요하다는 것을 발견해 T4 hotfix와 migration 00007로 추가됐다.

## Details

### 허용 작업 목록

| 작업 | 엔드포인트 | 조건 |
|------|-----------|------|
| 학원 전체 세션 조회 | `GET /api/sessions` | academy_id 기반 |
| 이해도 분석 조회 | `GET /api/ai/analysis` | academy_id 기반 |
| 이해도 분석 트리거 | `POST /api/ai/analysis` | (허용, 정책 재검토 필요) |
| 리포트 조회 | `GET /api/ai/report` | — |
| 리포트 생성 트리거 | `POST /api/ai/report` | (허용, RLS와 불일치 가능) |
| 위험 신호 목록 | `GET /api/mentor/students` | academy_id 기반 |
| 수강생 상세 | `GET /api/mentor/students/[id]` | — |
| AI 브리핑 생성 | `POST /api/ai/mentor-briefing` | role=mentor/owner |
| 상담 기록 전체 조회 | `GET /api/mentor/consultations` | 학원 전체 |
| 상담 기록 작성 | `POST /api/mentor/consultations` | role 포함 |

### 미허용 작업

- 세션 생성/전환/삭제 (`POST/PATCH/DELETE /api/sessions`) → 403
- 퀴즈 생성 (`POST /api/ai/quiz`) → 403
- 수강생 응답 제출 (`POST /api/responses`) → 403

## Connections

- [[concept-session]] — downstream: mentor는 academy_id 기반으로 학원 세션을 읽기 접근
- [[concept-risk-signal]] — upstream: 위험 신호 분석이 mentor의 주 업무 데이터
- [[concept-academy-isolation]] — downstream: mentor의 학원 전체 접근이 academy_id RLS로 보장
- [[feature-f8-owner-dashboard]] — uses: F8 대시보드가 mentor의 주 화면
- [[feature-f9-sharing]] — uses: F9 브리핑이 mentor의 상담 준비 도구
- [[role-teacher]] — see-also: teacher와 유사한 읽기 권한, 세션 생성·퀴즈 생성은 불가
- [[role-owner]] — see-also: owner보다 좁은 범위 (배정 학원 내)
- [[role-student]] — see-also: mentor가 위험 수강생을 식별해 상담

## Gotchas

- **mentor Cycle 1 누락 (T4 hotfix)**: 초기 `isTeacher = ["owner", "teacher"]`에 mentor가 없어 `GET /api/sessions`에서 student 분기(참여 세션만)로 처리됐다. T4에서 `isStaff = ["owner", "teacher", "mentor"]`(또는 동등 처리)로 수정.
- **mentor `GET /api/sessions/[id]` join_code 미노출**: `[id]/route.ts`의 `isTeacher` 체크(`["owner", "teacher"]`)가 mentor를 제외하므로, mentor가 세션 단건 조회 시 join_code를 받지 못한다. mentor가 수업 중 join_code를 확인할 필요가 없으면 의도된 설계.
- **mentor POST /api/ai/analysis 허용 의도**: mentor가 분석을 트리거(`POST`)하면 `analysis_results`에 레코드가 생성된다. 이는 강사의 의도와 무관한 분석 이력을 남길 수 있다. 의도된 허용인지 정책 확인 필요.
- **mentor POST /api/ai/report vs RLS 불일치**: API 레이어는 mentor의 `POST /api/ai/report`를 허용하지만, `student_reports` INSERT RLS가 `get_my_role() IN ('owner', 'teacher')`로 mentor를 제외할 수 있다. 실제 DB 저장 시 RLS 위반 가능.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
