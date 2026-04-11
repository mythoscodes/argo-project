---
type: role
id: role-owner
related:
  - "[[concept-academy-isolation]]"
  - "[[concept-risk-signal]]"
  - "[[concept-session]]"
  - "[[feature-f8-owner-dashboard]]"
  - "[[role-teacher]]"
  - "[[role-mentor]]"
  - "[[role-student]]"
sources:
  - "supabase/migrations/00001_initial_schema.sql#profiles"
  - "supabase/migrations/00007_add_mentor_role.sql"
  - "src/app/api/sessions/route.ts"
  - "src/app/api/dashboard/route.ts"
  - "src/app/owner/page.tsx"
updated: 2026-04-11
owner: planner
---

# Role: Owner (원장)

## Summary

학원 전체를 관리하는 최상위 역할. `profiles.role = 'owner'`이며, teacher의 모든 권한과 더불어 학원 전체 세션·수강생 데이터 조회, 원장 대시보드 KPI 접근이 가능하다. Supabase `service_role`과는 구별된 앱 레벨 역할이다.

## Key Claims

- `profiles.role` CHECK 제약에서 `'owner'`는 최초부터 허용 값에 포함된다 — `migrations/00001_initial_schema.sql` L36
- `sessions_insert_teacher` RLS는 `get_my_role() IN ('owner', 'teacher')`로 owner도 세션 생성을 허용한다 — `migrations/00006` L62-65
- `GET /api/sessions`에서 owner는 teacher와 동일하게 `teacher_id = user.id`인 세션만 조회한다; 학원 전체 세션 목록은 별도 대시보드 API(`/api/dashboard`)로 접근 — `sessions/route.ts` L45-63
- `consultation_notes` SELECT 시 owner는 학원 전체 상담 기록 조회 가능 (mentor와 동급) — `migrations/00007` L28-34
- owner는 `GET /api/dashboard`로 학원 KPI(전체 세션 수, 평균 이해도, 위험 수강생 수)를 조회한다

## Intuition / Why

학원 원장은 개별 수업의 이해도 데이터보다 "학원 전체가 잘 운영되고 있는가"를 파악하는 것이 주 관심사다. Argos에서 owner는 teacher와 기술적으로 거의 동일한 API 권한을 가지지만, 별도의 대시보드를 통해 학원 전체 뷰를 제공받는다.

owner가 `teacher_id = user.id` 세션만 보는 이유: MVP 설계에서 owner가 직접 수업을 진행하는 경우도 있다(소규모 학원에서 원장이 강사 겸임). 학원 전체 세션은 대시보드 KPI로 집계해서 보여주는 방식을 채택했다.

## Details

### teacher와의 권한 비교

| 기능 | teacher | owner |
|------|---------|-------|
| 세션 생성 | 가능 | 가능 |
| 퀴즈 생성 | 본인 세션만 | 본인 세션만 |
| 이해도 분석 | 가능 | 가능 |
| AI 코칭 | 가능 | 가능 |
| 리포트 생성 | 가능 | 가능 |
| 위험 수강생 조회 | 본인 세션만 | 가능 |
| 학원 KPI 대시보드 | 불가 | 가능 |
| 상담 기록 전체 조회 | 본인 것만 | 가능 |

## Connections

- [[concept-academy-isolation]] — downstream: owner의 학원 데이터 접근이 academy_id RLS를 따름
- [[concept-risk-signal]] — uses: owner가 위험 신호 대시보드에서 학원 전체 수강생 모니터링
- [[concept-session]] — uses: owner도 teacher처럼 세션 생성 가능
- [[feature-f8-owner-dashboard]] — uses: F8이 owner의 주 뷰포인트
- [[role-teacher]] — see-also: owner는 teacher 권한의 수퍼셋 (대시보드 추가)
- [[role-mentor]] — see-also: mentor와 상담 기록 접근 범위 동일 (학원 전체)
- [[role-student]] — see-also: 학원 수강생 전체가 owner의 모니터링 대상

## Gotchas

- **`GET /api/sessions` 범위**: owner가 `GET /api/sessions`를 호출하면 본인이 생성한 세션(`teacher_id=user.id`)만 반환된다. "원장으로서 학원 전체 세션 목록"을 원한다면 `/api/dashboard` 또는 별도 admin 엔드포인트가 필요하다. 현재 dashboard API가 KPI 집계는 제공하지만 원장이 강사 세션 목록 전체를 조회하는 기능은 미구현.
- **academies INSERT/UPDATE 미지원**: `academies` 테이블 RLS에 INSERT/UPDATE 정책이 없다. 학원 생성은 service_role(서버 관리자)이 직접 수행하며, owner 계정 생성 시 미리 학원 레코드가 존재해야 한다 — `migrations/00006` L44-48.

## Changelog

- 2026-04-11 — 초판 작성 (planner)
