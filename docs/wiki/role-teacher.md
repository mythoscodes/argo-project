---
type: role
id: role-teacher
related:
  - "[[concept-session]]"
  - "[[concept-quiz]]"
  - "[[concept-heatmap]]"
  - "[[concept-academy-isolation]]"
  - "[[feature-f1-session]]"
  - "[[feature-f2-quiz-generation]]"
  - "[[feature-f5-ai-coaching]]"
  - "[[feature-f7-report]]"
  - "[[role-owner]]"
  - "[[role-student]]"
  - "[[role-mentor]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#profiles"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "src/app/api/sessions/route.ts"
  - "src/app/api/ai/quiz/route.ts"
  - "src/app/api/auth/register/route.ts"
updated: 2026-04-11
owner: planner
---

# Role: Teacher (강사)

## Summary

KIT 직업훈련 수업을 담당하는 사용자. 세션 생성·전환, AI 퀴즈 생성, AI 코칭, 리포트 생성의 주체. `profiles.role = 'teacher'`이며, API에서 `["owner", "teacher"].includes(role)` 조건으로 권한이 부여된다.

## Key Claims

- `profiles.role` CHECK 제약에서 `'teacher'`는 허용 4값 중 하나이다 — `migrations/00007_add_mentor_role.sql` L10
- `POST /api/sessions`는 `["owner", "teacher"].includes(profile.role)` 조건으로 teacher에게 허용된다 — `src/app/api/sessions/route.ts` L112
- `POST /api/ai/quiz`는 teacher이면서 `session.teacher_id === user.id`인 경우에만 허용된다; 소유권 이중 검증 — `src/app/api/ai/quiz/route.ts` L87, L130
- `GET /api/sessions`에서 teacher는 `teacher_id = user.id`인 본인 세션만 조회한다 — `sessions/route.ts` L47-63
- teacher는 자신이 작성한 `consultation_notes`만 SELECT 가능하다; mentor/owner는 학원 전체 조회 가능 — `migrations/00007` L28-34

## Intuition / Why

강사는 Argos의 핵심 사용자이다. 강사가 수업 중 실시간으로 수강생 이해도를 파악하고 즉각 개입하는 것이 Argos의 주된 가치다. 세션 소유권(teacher_id)이 강사 단위로 부여되므로, 여러 강사가 같은 학원에 있어도 서로의 수업 데이터를 분리해서 관리한다.

## Details

### 허용 작업 목록

| 작업 | 엔드포인트 | 조건 |
|------|-----------|------|
| 세션 생성 | `POST /api/sessions` | role=teacher/owner |
| 세션 상태 전환 | `PATCH /api/sessions/[id]` | teacher_id=self |
| 세션 삭제 | `DELETE /api/sessions/[id]` | teacher_id=self |
| AI 퀴즈 생성 | `POST /api/ai/quiz` | role + teacher_id=self |
| 이해도 분석 | `GET/POST /api/ai/analysis` | role=teacher/owner/mentor |
| AI 코칭 생성 | `POST /api/ai/coaching` | role=teacher/owner |
| 리포트 생성 | `POST /api/ai/report` | role=teacher/owner/mentor |
| 내 세션 퀴즈 조회 | `GET /api/quizzes` | 인증 후 전체(정답 포함) |
| 내 상담 기록 | `GET /api/mentor/consultations` | instructor_id=self |

### 등록 흐름

```
POST /api/auth/register { role: "teacher", joinCode: <학원코드>, ... }
  → joinCode로 academies 조회 → academy_id 확보
  → Supabase Auth 사용자 생성
  → profiles INSERT { role: "teacher", academy_id }
```

## Connections

- [[concept-session]] — upstream: 강사만 세션 생성·전환 가능
- [[concept-quiz]] — upstream: 강사만 AI 퀴즈 생성 가능 (소유권 이중 검증)
- [[concept-heatmap]] — upstream: 히트맵은 강사 대시보드에서만 표시
- [[concept-academy-isolation]] — downstream: teacher의 모든 데이터 접근이 academy_id RLS를 따름
- [[feature-f1-session]] — uses: F1이 teacher의 주 업무 흐름
- [[feature-f2-quiz-generation]] — uses: F2가 teacher의 퀴즈 생성 도구
- [[feature-f5-ai-coaching]] — uses: F5가 teacher의 코칭 보조 도구
- [[feature-f7-report]] — uses: F7이 teacher가 리포트를 생성하는 기능
- [[role-owner]] — see-also: owner는 teacher보다 넓은 조회 범위를 가진 상위 역할
- [[role-student]] — see-also: 수강생은 강사의 세션에 join_code로 참여
- [[role-mentor]] — see-also: mentor는 teacher 세션 데이터를 읽기로 접근

## Gotchas

- **`isTeacher` 변수명 mentor 미포함 버그 (T4)**: `GET /api/sessions`에서 초기에 `isTeacher = ["owner", "teacher"]`로 선언해 mentor가 student 분기로 떨어졌다. T4에서 수정. mentor를 teacher-like 역할로 취급하는 코드에서 항상 `["owner", "teacher", "mentor"]` 포함 여부를 확인할 것.
- **`GET /api/sessions/[id]` join_code**: teacher(및 owner)는 단건 조회 시 join_code 포함 응답을 받는다. mentor는 `isTeacher` 체크에서 제외되어 join_code를 받지 못한다 — `[id]/route.ts` L56.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
