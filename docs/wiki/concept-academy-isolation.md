---
type: concept
id: concept-academy-isolation
related:
  - "[[concept-session]]"
  - "[[concept-join-code]]"
  - "[[concept-risk-signal]]"
  - "[[role-teacher]]"
  - "[[role-student]]"
  - "[[role-mentor]]"
  - "[[role-owner]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql"
  - "supabase/migrations/00006_fix_profiles_rls_recursion.sql"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "src/lib/constants.ts"
updated: 2026-04-11
owner: planner
---

# Academy Isolation (학원 격리)

## Summary

Argos의 모든 테이블이 `academy_id` 컬럼을 기준으로 다중 학원 데이터를 격리하는 RLS 설계 원칙. 로그인한 사용자는 자신과 같은 `academy_id`에 속한 데이터만 조회·삽입할 수 있다. `get_my_academy_id()` SECURITY DEFINER 함수가 RLS 정책의 핵심 빌딩 블록이다.

## Key Claims

- 모든 주요 테이블(`profiles`, `academies`, `sessions`, `quizzes`, `responses`, `analysis_results`, `student_reports`, `courses`, `consultation_notes`)에 RLS가 활성화되어 있다 — `migrations/00001_initial_schema.sql`, `migrations/00002_mentor_tables.sql`
- `get_my_academy_id()` 함수는 `SECURITY DEFINER`로 선언되어 호출자의 RLS가 아닌 함수 소유자 권한으로 `profiles.academy_id`를 조회한다; RLS 무한 재귀를 방지하는 핵심 기법이다 — `migrations/00006_fix_profiles_rls_recursion.sql` L9-17
- `profiles.role` CHECK 제약은 `'owner'`, `'teacher'`, `'student'`, `'mentor'` 4값만 허용한다; migration 00007에서 `'mentor'`가 추가됐다 — `migrations/00007_add_mentor_role.sql` L10
- 모든 SELECT RLS에서 학원 내 전 역할이 같은 데이터를 볼 수 있다; `sessions_select_same_academy`는 teacher/student/mentor/owner 구분 없이 `academy_id = get_my_academy_id()` 조건 하나만 적용한다 — `migrations/00006` L54-57
- INSERT RLS는 역할별로 분기된다: 세션 삽입은 `get_my_role() IN ('owner', 'teacher')` 조건이 추가된다 — `migrations/00006` L62-65
- `consultation_notes` SELECT는 예외적으로 `instructor_id = auth.uid() OR get_my_role() IN ('owner', 'mentor')`로 제한된다; teacher는 자신이 작성한 상담 기록만 조회 가능하다 — `migrations/00007` L28-34

## Intuition / Why

Argos는 다수의 직업훈련 학원이 사용하는 SaaS다. 학원 A의 강사가 학원 B의 수강생 데이터를 볼 수 없어야 한다. Row Level Security(RLS)가 이 격리를 DB 레벨에서 강제하므로, 애플리케이션 코드가 `WHERE academy_id = ...` 필터를 누락해도 다른 학원 데이터가 노출되지 않는다.

`get_my_academy_id()` SECURITY DEFINER 도입 이유: 원래 `profiles_select_same_academy` RLS가 `academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())`로 작성되어 있었는데, 이 서브쿼리 자체가 `profiles` 테이블을 조회하면서 동일한 RLS를 재적용 → 무한 재귀 → 500 에러가 발생했다. Cycle 1에서 dev-2가 migration 00006으로 SECURITY DEFINER 함수를 도입해 해결. 이 사건은 Cycle 2 P0 조건의 Gotcha로 기록됐다.

## Details

### 격리 메커니즘

```
모든 요청
  → supabase.auth.getUser() → user.id
  → get_my_academy_id() [SECURITY DEFINER]
      → SELECT academy_id FROM profiles WHERE id = auth.uid()
      → (RLS 우회, 직접 조회)
      → 반환: UUID
  → 각 테이블 RLS: academy_id = <반환 UUID>
  → 다른 학원 데이터 자동 필터링
```

### 테이블별 RLS 정책 요약

| 테이블 | SELECT 정책 | INSERT 정책 | 비고 |
|--------|------------|------------|------|
| `academies` | `id = get_my_academy_id()` | — | 자기 학원만 |
| `profiles` | `academy_id = get_my_academy_id()` | 별도 | 같은 학원 전원 |
| `sessions` | `academy_id = get_my_academy_id()` | role IN (owner, teacher) | 전역 조회, 삽입 제한 |
| `quizzes` | 세션→academy_id 체인 | `teacher_id = auth.uid()` | 세션 소유 검증 |
| `responses` | 세션→academy_id 체인 | `student_id = auth.uid()` | 자기 응답만 삽입 |
| `analysis_results` | 세션→academy_id 체인 | teacher 소유 세션만 | — |
| `student_reports` | `academy_id = get_my_academy_id()` | role IN (owner, teacher) | — |
| `consultation_notes` | academy + (instructor_id 또는 owner/mentor role) | instructor + role IN (owner, teacher, mentor) | teacher는 본인 기록만 |

### RLS 계보 (migration 순서)

1. `00001` — 초기 RLS (재귀 버그 포함)
2. `00004` — INSERT/DELETE 정책 보완
3. `00005` — analysis_results owner 접근 허용
4. **`00006`** — RLS 무한 재귀 해결 (get_my_academy_id/get_my_role SECURITY DEFINER)
5. `00007` — mentor role 추가 + consultation_notes 정책 교정

## Connections

- [[concept-session]] — downstream: sessions_select_same_academy RLS가 세션의 학원 격리 구현
- [[concept-join-code]] — see-also: join_code는 학원 격리와 독립된 입장 제어 (코드 직접 조회 방식)
- [[concept-risk-signal]] — downstream: mentor의 위험 신호 분석이 academy_id 기반으로 범위 제한
- [[role-teacher]] — downstream: teacher의 INSERT 권한이 get_my_role() 검증으로 보호
- [[role-student]] — downstream: student의 responses INSERT가 student_id = auth.uid()로 보호
- [[role-mentor]] — downstream: mentor는 consultation_notes의 학원 전체 조회 권한을 RLS로 보장받음
- [[role-owner]] — downstream: owner는 get_my_role() IN ('owner', ...) 조건으로 확장 권한

## Gotchas

- **RLS 무한 재귀 사건 (Cycle 1 P0)**: `profiles_select_same_academy` 원본 정책이 `profiles` 테이블을 서브쿼리로 참조해 무한 재귀→500 에러를 일으켰다. Supabase Remote에 migration 00006이 미적용된 상태에서 Cycle 1 전체 테스트가 실패했다. dev-2가 MCP `apply_migration` 으로 해결. 이후 "Supabase Remote 마이그레이션 상태 먼저 확인" 규칙이 Cycle 2 P0 기준으로 확정됐다.
- **`consultation_notes` teacher 조회 제한**: teacher는 자신이 작성한 상담 기록(`instructor_id = auth.uid()`)만 SELECT 가능하다. 동일 학원의 다른 강사가 작성한 상담 기록은 조회 불가 — `migrations/00007` L28-34. owner와 mentor는 학원 전체 상담 기록 조회 가능.
- **SELECT vs INSERT RLS 불균형**: 모든 역할이 같은 학원 데이터를 SELECT 할 수 있지만, INSERT는 역할 조건이 추가된다. 이는 의도된 설계다. 그러나 student가 다른 수강생의 `responses`를 SELECT할 수 있다는 점을 인지해야 한다 (학원 격리이지 개인 격리가 아님).
- **`get_my_role()` 캐싱 없음**: 한 API 요청 내에서 여러 정책이 `get_my_role()`을 호출하면 profiles 테이블이 반복 조회된다. PostgreSQL `STABLE` 함수이므로 동일 트랜잭션 내에서는 캐싱될 수 있으나, N+1 쿼리 위험이 있다.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
